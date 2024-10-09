from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import os
from crewai import Agent, Task, Crew, Process
from flask_socketio import SocketIO
from threading import Thread
import uuid
from datetime import timedelta, datetime
from functools import wraps
import stripe

# Import the agent creation functions
from agents import create_researcher, create_writer
from tasks import create_researcher_task, create_writer_task

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'fallback_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=3)  # Set session timeout to 3 hours
db = SQLAlchemy(app)
socketio = SocketIO(app, async_mode='threading')

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'signin'

# Stripe configuration
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    full_name = db.Column(db.String(120), nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))
    plan = db.Column(db.String(20), default='Free')
    stripe_customer_id = db.Column(db.String(255), unique=True, nullable=True)
    stripe_subscription_id = db.Column(db.String(255), unique=True, nullable=True)
    next_billing_date = db.Column(db.DateTime, nullable=True)

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Invoice(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    stripe_invoice_id = db.Column(db.String(255), unique=True, nullable=False)
    amount = db.Column(db.Float, nullable=False)
    date = db.Column(db.DateTime, nullable=False)
    description = db.Column(db.String(255), nullable=False)

@login_manager.user_loader
def load_user(user_id):
    return User.query.get(int(user_id))

def login_required_custom(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated:
            return redirect(url_for('signin', next=request.url))
        return f(*args, **kwargs)
    return decorated_function

# Crew functions (as per your agents and tasks)
def create_crew(topic, content_type, target_audience, tone, sid):

    # Create agents
    researcher = create_researcher(topic, target_audience)
    writer = create_writer(content_type, tone, target_audience)

    # Create tasks
    task1 = create_researcher_task(researcher, topic, target_audience)
    task2 = create_writer_task(writer, content_type, tone, target_audience)

    crew = Crew(
        agents=[researcher, writer],
        tasks=[task1, task2],
        process=Process.sequential,
        cache=False,
        verbose=True,
    )

    return crew

def run_crew(topic, content_type, target_audience, tone, request_id):
    try:
        crew = create_crew(topic, content_type, target_audience, tone, request_id)
        crew_output = crew.kickoff()
        
        result = {
            'task_outputs': [],
            'final_output': str(crew_output)
        }

        if hasattr(crew_output, 'tasks'):
            result['task_outputs'] = [
                {
                    'task_id': task.task_id,
                    'output': task.output
                } for task in crew_output.tasks
            ]
        
        socketio.emit('generation_complete', {'result': result, 'request_id': request_id})
    except Exception as e:
        app.logger.error(f"Error in background task: {str(e)}")
        socketio.emit('generation_error', {'error': 'An error occurred during content generation.', 'request_id': request_id})

# Routes
@app.route('/')
def home():
    return render_template('home.html')

@app.route('/index')
def index():
    return render_template('index.html')

@app.route('/dashboard')
@login_required_custom
def dashboard():
    return render_template('dashboard.html')

@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        full_name = request.form.get('full_name')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm_password')
        
        if password != confirm_password:
            flash('Passwords do not match')
            return redirect(url_for('signup'))
        
        user = User.query.filter_by(email=email).first()
        if user:
            flash('Email already exists')
            return redirect(url_for('signup'))
        
        new_user = User(full_name=full_name, email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        # Log the user in after successful account creation
        login_user(new_user)
        flash('Account created successfully')
        return redirect(url_for('pricing'))
    
    return render_template('signup.html')

@app.route('/signin', methods=['GET', 'POST'])
def signin():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            login_user(user)
            session.permanent = True  # Use the permanent session with our custom lifetime
            next_page = request.args.get('next')
            return redirect(next_page or url_for('dashboard'))
        else:
            flash('Invalid email or password')
    
    return render_template('signin.html')

@app.route('/signout')
@login_required_custom
def signout():
    logout_user()
    return redirect(url_for('home'))

@app.route('/generate', methods=['GET', 'POST'])
@login_required_custom
def generate():
    if request.method == 'POST':
        data = request.json
        topic = data['topic']
        content_type = data['contentType']
        target_audience = data['targetAudience']
        tone = data['tone']
        request_id = str(uuid.uuid4())

        Thread(target=run_crew, args=(topic, content_type, target_audience, tone, request_id)).start()
        return jsonify({'message': 'Generation started', 'request_id': request_id}), 202
    else:
        return render_template('content.html')

@app.route('/pricing', methods=['GET', 'POST'])
@login_required_custom
def pricing():
    if request.method == 'POST':
        plan = request.form.get('plan')
        if plan in ['Free', 'Standard', 'Premium']:
            current_user.plan = plan
            db.session.commit()
            flash(f'Your plan has been updated to {plan}')
            return redirect(url_for('dashboard'))
    return render_template('pricing.html')

@app.route('/blog')
def blog():
    return render_template('blog.html')

@app.route('/about')
def about():
    return render_template('about.html')

@app.route('/contact')
def contact():
    return render_template('contact.html')

@app.route('/content')
@login_required_custom
def content():
    return render_template('content.html')

@app.route('/service')
def service():
    return render_template('service.html')

@app.route('/billing', methods=['GET', 'POST'])
@login_required_custom
def billing():
    if request.method == 'POST':
        # Handle plan change
        new_plan = request.form.get('plan')
        if new_plan in ['Free', 'Standard', 'Premium']:
            update_stripe_subscription(current_user, new_plan)
            flash(f'Your plan has been updated to {new_plan}')
    
    # Get current payment method
    payment_method = get_stripe_payment_method(current_user)
    
    # Get billing history
    invoices = Invoice.query.filter_by(user_id=current_user.id).order_by(Invoice.date.desc()).all()
    
    return render_template('billing.html', 
                           user=current_user, 
                           payment_method=payment_method, 
                           invoices=invoices)

@app.route('/update_payment_method', methods=['POST'])
@login_required_custom
def update_payment_method():
    token = request.form.get('stripeToken')
    if not token:
        flash('Invalid payment information')
        return redirect(url_for('billing'))
    
    try:
        update_stripe_payment_method(current_user, token)
        flash('Payment method updated successfully')
    except stripe.error.StripeError as e:
        flash(f'Error updating payment method: {str(e)}')
    
    return redirect(url_for('billing'))

def update_stripe_subscription(user, new_plan):
    if not user.stripe_customer_id:
        customer = stripe.Customer.create(email=user.email)
        user.stripe_customer_id = customer.id
    
    # Define your price IDs for each plan
    price_ids = {
        'Free': None,  # Free plan doesn't have a price ID
        'Standard': 'price_standard_id',
        'Premium': 'price_premium_id'
    }
    
    if user.stripe_subscription_id:
        # Update existing subscription
        subscription = stripe.Subscription.modify(
            user.stripe_subscription_id,
            items=[{'price': price_ids[new_plan]}]
        )
    elif new_plan != 'Free':
        # Create new subscription
        subscription = stripe.Subscription.create(
            customer=user.stripe_customer_id,
            items=[{'price': price_ids[new_plan]}]
        )
        user.stripe_subscription_id = subscription.id
    
    user.plan = new_plan
    user.next_billing_date = datetime.fromtimestamp(subscription.current_period_end) if subscription else None
    db.session.commit()

def get_stripe_payment_method(user):
    if not user.stripe_customer_id:
        return None
    
    payment_methods = stripe.PaymentMethod.list(
        customer=user.stripe_customer_id,
        type='card'
    )
    
    return payment_methods.data[0] if payment_methods.data else None

def update_stripe_payment_method(user, token):
    if not user.stripe_customer_id:
        customer = stripe.Customer.create(email=user.email)
        user.stripe_customer_id = customer.id
        db.session.commit()
    
    stripe.PaymentMethod.attach(
        token,
        customer=user.stripe_customer_id,
    )
    
    stripe.Customer.modify(
        user.stripe_customer_id,
        invoice_settings={'default_payment_method': token},
    )

@app.route('/webhook', methods=['POST'])
def webhook():
    payload = request.data
    sig_header = request.headers.get('Stripe-Signature')

    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, os.environ.get('STRIPE_WEBHOOK_SECRET')
        )
    except ValueError as e:
        return 'Invalid payload', 400
    except stripe.error.SignatureVerificationError as e:
        return 'Invalid signature', 400

    if event['type'] == 'invoice.paid':
        handle_paid_invoice(event['data']['object'])

    return '', 200

def handle_paid_invoice(invoice_data):
    user = User.query.filter_by(stripe_customer_id=invoice_data['customer']).first()
    if user:
        new_invoice = Invoice(
            user_id=user.id,
            stripe_invoice_id=invoice_data['id'],
            amount=invoice_data['amount_paid'] / 100,  # Convert cents to dollars
            date=datetime.fromtimestamp(invoice_data['created']),
            description=f"Payment for {user.plan} plan"
        )
        db.session.add(new_invoice)
        db.session.commit()

@app.route('/profile', methods=['GET', 'POST'])
@login_required_custom
def profile():
    if request.method == 'POST':
        full_name = request.form.get('full_name')
        email = request.form.get('email')
        
        if email != current_user.email and User.query.filter_by(email=email).first():
            flash('Email already exists')
        else:
            current_user.full_name = full_name
            current_user.email = email
            db.session.commit()
            flash('Profile updated successfully')
        
        return redirect(url_for('profile'))
    
    return render_template('profile.html')

@socketio.on('connect')
def handle_connect():
    print('Client connected')

@socketio.on('disconnect')
def handle_disconnect():
    print('Client disconnected')

def init_db():
    with app.app_context():
        db.create_all()
        print("Database initialized.")

if __name__ == '__main__':
    init_db()
    socketio.run(app, debug=True)
else:
    init_db()