from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session, abort
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import os
from crewai import Agent, Task, Crew, Process
from agents import create_researcher, create_writer
from tasks import create_researcher_task, create_writer_task
from tools import tavily_search
from flask_socketio import SocketIO, emit, join_room
from threading import Thread
import uuid
from datetime import timedelta, datetime
from functools import wraps
import stripe
from sqlalchemy import func
import traceback
from flask import current_app
from flask_migrate import Migrate

# importing admin features and models
from admin import init_admin
from models import db, User, Invoice, Content, Project

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('FLASK_SECRET_KEY', 'fallback_secret_key')
app.config['SQLALCHEMY_DATABASE_URI'] = 'sqlite:///users.db'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False
app.config['PERMANENT_SESSION_LIFETIME'] = timedelta(hours=3)  # Set session timeout to 3 hours
db.init_app(app)
migrate = Migrate(app, db)

socketio = SocketIO(app, cors_allowed_origins="*")

login_manager = LoginManager()
login_manager.init_app(app)
login_manager.login_view = 'signin'

# Stripe configuration
stripe.api_key = os.environ.get('STRIPE_SECRET_KEY')

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

def create_crew(topic, content_type, target_audience, tone, request_id):
    researcher = create_researcher(topic, target_audience)
    writer = create_writer(content_type, tone, target_audience)

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

def run_crew(topic, content_type, target_audience, tone, request_id, user_id):
    with app.app_context():
        try:
            crew = create_crew(topic, content_type, target_audience, tone, request_id)
            
            socketio.emit('generation_progress', {'message': 'Starting content generation...'}, room=request_id)
            
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
            
            new_content = Content(
                user_id=user_id,
                title=topic,
                content=result['final_output'],
                content_type=content_type
            )
            db.session.add(new_content)
            db.session.commit()
            
            socketio.emit('generation_complete', {'result': result, 'request_id': request_id}, room=request_id)
        except Exception as e:
            socketio.emit('generation_error', {'error': 'An error occurred during content generation.', 'request_id': request_id}, room=request_id)

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
        
        if not all([full_name, email, password, confirm_password]):
            return jsonify({'success': False, 'message': 'All fields are required'})
        
        if password != confirm_password:
            return jsonify({'success': False, 'message': 'Passwords do not match'})
        
        user = User.query.filter_by(email=email).first()
        if user:
            return jsonify({'success': False, 'message': 'Email already exists'})
        
        try:
            new_user = User(full_name=full_name, email=email)
            new_user.set_password(password)
            db.session.add(new_user)
            db.session.commit()
            
            login_user(new_user)
            return jsonify({'success': True, 'message': 'Account created successfully'})
        except Exception as e:
            db.session.rollback()
            return jsonify({'success': False, 'message': 'An error occurred during signup'})
    
    return render_template('signup.html')

@app.route('/signin', methods=['GET', 'POST'])
def signin():
    if request.method == 'POST':
        email = request.form.get('email')
        password = request.form.get('password')
        
        if not email or not password:
            return jsonify({'success': False, 'message': 'Email and password are required'})
        
        user = User.query.filter_by(email=email).first()
        
        if user and user.check_password(password):
            login_user(user)
            session.permanent = True
            next_page = request.args.get('next')
            return jsonify({'success': True, 'redirect': next_page or url_for('dashboard')})
        else:
            return jsonify({'success': False, 'message': 'Invalid email or password'})
    
    return render_template('signin.html')


@app.route('/signout')
@login_required_custom
def signout():
    logout_user()
    return redirect(url_for('home'))

@app.route('/generate', methods=['POST'])
@login_required_custom
def generate():
    data = request.json
    topic = data['topic']
    content_type = data['contentType']
    target_audience = data['targetAudience']
    tone = data['tone']
    request_id = str(uuid.uuid4())

    thread = Thread(target=run_crew, args=(topic, content_type, target_audience, tone, request_id, current_user.id))
    thread.start()
    
    return jsonify({'message': 'Generation started', 'request_id': request_id}), 202

@app.route('/price', methods=['GET', 'POST'])
@login_required_custom
def pricing():
    if request.method == 'POST':
        plan = request.form.get('plan')
        if plan in ['Free', 'Standard', 'Premium']:
            current_user.plan = plan
            db.session.commit()
            flash(f'Your plan has been updated to {plan}')
            return redirect(url_for('dashboard'))
    return render_template('price.html')

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

@app.route('/privacy-policy')
def privacy_policy():
    return render_template('privacy-policy.html')

@app.route('/terms-of-service')
def terms_of_service():
    return render_template('terms-of-service.html')

@app.route('/api/billing', methods=['GET'])
@login_required_custom
def api_billing():
    payment_method = get_stripe_payment_method(current_user)
    
    invoices = Invoice.query.filter_by(user_id=current_user.id).order_by(Invoice.date.desc()).all()
    
    billing_data = {
        'currentPlan': current_user.plan,
        'billingCycle': 'Monthly',
        'nextBillingDate': current_user.next_billing_date.strftime('%B %d, %Y') if current_user.next_billing_date else 'N/A',
        'paymentMethod': {
            'type': payment_method.card.brand.capitalize() if payment_method else None,
            'last4': payment_method.card.last4 if payment_method else None,
            'expiryDate': f"{payment_method.card.exp_month}/{payment_method.card.exp_year}" if payment_method else None
        } if payment_method else None,
        'billingHistory': [
            {
                'date': invoice.date.strftime('%B %d, %Y'),
                'description': invoice.description,
                'amount': invoice.amount,
                'invoiceId': invoice.stripe_invoice_id
            } for invoice in invoices
        ]
    }
    
    return jsonify(billing_data)

@app.route('/api/update-payment-method', methods=['POST'])
@login_required_custom
def api_update_payment_method():
    card_number = request.form.get('cardNumber')
    expiry_date = request.form.get('expiryDate')
    cvv = request.form.get('cvv')
    
    try:
        payment_method = stripe.PaymentMethod.create(
            type="card",
            card={
                "number": card_number,
                "exp_month": int(expiry_date.split('/')[0]),
                "exp_year": int(expiry_date.split('/')[1]),
                "cvc": cvv,
            },
        )
        
        stripe.PaymentMethod.attach(
            payment_method.id,
            customer=current_user.stripe_customer_id,
        )
        
        stripe.Customer.modify(
            current_user.stripe_customer_id,
            invoice_settings={"default_payment_method": payment_method.id},
        )
        
        return jsonify({'success': True, 'message': 'Payment method updated successfully'})
    except stripe.error.StripeError as e:
        return jsonify({'success': False, 'message': str(e)}), 400

@app.route('/download-invoice/<invoice_id>', methods=['GET'])
@login_required_custom
def download_invoice(invoice_id):
    try:
        invoice = stripe.Invoice.retrieve(invoice_id)
        return redirect(invoice.invoice_pdf)
    except stripe.error.StripeError as e:
        flash(f"Error downloading invoice: {str(e)}")
        return redirect(url_for('billing'))

@app.route('/billing', methods=['GET', 'POST'])
@login_required_custom
def billing():
    if request.method == 'POST':
        new_plan = request.form.get('plan')
        if new_plan in ['Free', 'Standard', 'Premium']:
            update_stripe_subscription(current_user, new_plan)
            flash(f'Your plan has been updated to {new_plan}')
    
    return render_template('billing.html')

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
    
    price_ids = {
        'Free': None,
        'Standard': 'price_standard_id',
        'Premium': 'price_premium_id'
    }
    
    if user.stripe_subscription_id:
        subscription = stripe.Subscription.modify(
            user.stripe_subscription_id,
            items=[{'price': price_ids[new_plan]}]
        )
    elif new_plan != 'Free':
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

@app.route('/api/profile', methods=['GET', 'POST'])
@login_required_custom
def api_profile():
    if request.method == 'POST':
        full_name = request.form.get('full_name')
        email = request.form.get('email')
        
        if email != current_user.email and User.query.filter_by(email=email).first():
            return jsonify({'success': False, 'message': 'Email already exists'})
        else:
            current_user.full_name = full_name
            current_user.email = email
            
            db.session.commit()
            return jsonify({'success': True, 'message': 'Profile updated successfully'})
    
    return jsonify({
        'full_name': current_user.full_name,
        'email': current_user.email
    })

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

@app.route('/api/dashboard')
@login_required_custom
def dashboard_data():
    try:
        user_statistics = {
            'total_content': get_total_content_count(current_user.id),
            'active_projects': get_active_projects_count(current_user.id),
            'account_status': current_user.plan
        }

        recent_content = get_recent_content(current_user.id, limit=3)

        content_analytics = generate_content_analytics(current_user.id)

        user_info = {
            'full_name': current_user.full_name,
            'email': current_user.email
        }

        response_data = {
            'user_statistics': user_statistics,
            'recent_content': recent_content,
            'content_analytics': content_analytics,
            'user_info': user_info
        }

        return jsonify(response_data)
    except Exception as e:
        return jsonify({'error': 'An error occurred while fetching dashboard data'}), 500

def get_total_content_count(user_id):
    return Content.query.filter_by(user_id=user_id).count()

def get_active_projects_count(user_id):
    return Project.query.filter_by(user_id=user_id, status='active').count()

def get_recent_content(user_id, limit):
    recent_content = Content.query.filter_by(user_id=user_id).order_by(Content.created_at.desc()).limit(limit).all()
    return [{
        'id': content.id,
        'title': content.title,
        'type': content.content_type,
        'date': content.created_at.strftime('%B %d, %Y')
    } for content in recent_content]

def generate_content_analytics(user_id):
    end_date = datetime.now()
    start_date = end_date - timedelta(days=30)
    
    content_counts = db.session.query(
        func.date(Content.created_at).label('date'),
        func.count(Content.id).label('count')
    ).filter(
        Content.user_id == user_id,
        Content.created_at >= start_date,
        Content.created_at <= end_date
    ).group_by(func.date(Content.created_at)).all()

    date_counts = {result.date: result.count for result in content_counts}
    
    labels = [(end_date - timedelta(days=i)).strftime('%Y-%m-%d') for i in range(30, 0, -1)]
    data = [date_counts.get(label, 0) for label in labels]

    return {
        'labels': labels,
        'data': data
    }

@app.route('/api/update-account', methods=['POST'])
@login_required_custom
def update_account():
    full_name = request.form.get('fullName')
    email = request.form.get('email')
    password = request.form.get('password')

    if User.query.filter(User.email == email, User.id != current_user.id).first():
        return jsonify({'success': False, 'message': 'Email already in use'})

    current_user.full_name = full_name
    current_user.email = email
    if password:
        current_user.set_password(password)

    db.session.commit()

    return jsonify({'success': True})

@app.route('/view-content/<int:content_id>')
@login_required_custom
def view_content(content_id):
    content = Content.query.get_or_404(content_id)
    if content.user_id != current_user.id:
        abort(403)
    return render_template('view-content.html', content=content)

@socketio.on('connect')
def handle_connect():
    pass

@socketio.on('disconnect')
def handle_disconnect():
    pass

@socketio.on('join')
def on_join(data):
    room = data['room']
    join_room(room)

def init_db():
    with app.app_context():
        db.create_all()
        print("Database initialized.")

def init_admin(app):
    app.register_blueprint(admin)

if __name__ == '__main__':
    init_db()
    socketio.run(app, debug=False, host='0.0.0.0', port=5000, ssl_context='adhoc')
else:
    init_db()