from flask import Flask, render_template, request, jsonify, redirect, url_for, flash, session
from flask_sqlalchemy import SQLAlchemy
from flask_login import LoginManager, UserMixin, login_user, login_required, logout_user, current_user
from werkzeug.security import generate_password_hash, check_password_hash
import os
from crewai import Agent, Task, Crew, Process
from flask_socketio import SocketIO
from threading import Thread
import uuid
from datetime import timedelta
from functools import wraps

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


class User(UserMixin, db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    email = db.Column(db.String(120), unique=True, nullable=False)
    password_hash = db.Column(db.String(128))

    def set_password(self, password):
        self.password_hash = generate_password_hash(password)

    def check_password(self, password):
        return check_password_hash(self.password_hash, password)


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
def index():
    # This will render the index.html (home page)
    return render_template('index.html')


@app.route('/dashboard')
@login_required_custom
def dashboard():
    # Render dashboard page
    return render_template('dashboard.html')


@app.route('/signup', methods=['GET', 'POST'])
def signup():
    if request.method == 'POST':
        username = request.form.get('username')
        email = request.form.get('email')
        password = request.form.get('password')
        confirm_password = request.form.get('confirm-password')
        
        if password != confirm_password:
            flash('Passwords do not match')
            return redirect(url_for('signup'))
        
        user = User.query.filter_by(username=username).first()
        if user:
            flash('Username already exists')
            return redirect(url_for('signup'))
        
        user = User.query.filter_by(email=email).first()
        if user:
            flash('Email already exists')
            return redirect(url_for('signup'))
        
        new_user = User(username=username, email=email)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        flash('Account created successfully')
        return redirect(url_for('signin'))
    
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
        return render_template('dashboard.html')


@app.route('/pricing')
def pricing():
    # Render pricing.html
    return render_template('pricing.html')


@app.route('/blog')
def blog():
    # Render blog.html
    return render_template('blog.html')


@app.route('/about')
def about():
    # Render about.html
    return render_template('about.html')


@app.route('/contact')
def contact():
    # Render contact.html
    return render_template('contact.html')


@app.route('/service')
def service():
    # Render service.html
    return render_template('service.html')


@app.route('/products')
def products():
    # Render products.html
    return render_template('products.html')


@app.route('/price')
def price():
    # Render price.html
    return render_template('price.html')


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
