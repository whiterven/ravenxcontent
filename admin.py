from flask import Blueprint, render_template, request, redirect, url_for, flash, jsonify, current_app, session
from flask_login import current_user, login_user, logout_user, login_required
from werkzeug.security import generate_password_hash, check_password_hash
from sqlalchemy import desc
from datetime import datetime, timedelta
from functools import wraps
from models import db, User, Content, Project, Invoice, AuditLog, Announcement, SupportTicket
import stripe

admin = Blueprint('admin', __name__)

def admin_required(f):
    @wraps(f)
    def decorated_function(*args, **kwargs):
        if not current_user.is_authenticated or not current_user.is_admin:
            flash('You do not have permission to access this page.', 'error')
            return redirect(url_for('main.index'))
        return f(*args, **kwargs)
    return decorated_function

@admin.route('/admin/login', methods=['GET', 'POST'])
def admin_login():
    if current_user.is_authenticated:
        return redirect(url_for('admin.admin_dashboard'))

    if request.method == 'POST':
        email = request.form['email']
        password = request.form['password']
        user = User.query.filter_by(email=email).first()

        if user and user.is_admin and check_password_hash(user.password_hash, password):
            login_user(user)
            return redirect(url_for('admin.admin_dashboard'))
        else:
            flash('Invalid email or password, or not authorized as admin', 'error')

    return render_template('admin/login.html')

@admin.route('/admin/logout')
@login_required
def admin_logout():
    logout_user()
    return redirect(url_for('admin.admin_login'))

@admin.route('/admin/signup', methods=['GET', 'POST'])
def admin_signup():
    if request.method == 'POST':
        full_name = request.form['full_name']
        email = request.form['email']
        password = request.form['password']
        confirm_password = request.form['confirm_password']
        
        if not all([full_name, email, password, confirm_password]):
            flash('All fields are required', 'error')
            return redirect(url_for('admin.admin_signup'))
        
        if password != confirm_password:
            flash('Passwords do not match', 'error')
            return redirect(url_for('admin.admin_signup'))
        
        user = User.query.filter_by(email=email).first()
        if user:
            flash('Email already exists', 'error')
            return redirect(url_for('admin.admin_signup'))
        
        new_user = User(full_name=full_name, email=email, is_admin=True)
        new_user.set_password(password)
        db.session.add(new_user)
        db.session.commit()
        
        login_user(new_user)
        return redirect(url_for('admin.admin_dashboard'))
    
    return render_template('admin/signup.html')

@admin.route('/admin')
@login_required
@admin_required
def admin_dashboard():
    total_users = User.query.count()
    total_content = Content.query.count()
    recent_signups = User.query.order_by(desc(User.id)).limit(5).all()
    
    # Calculate revenue for the last 30 days
    thirty_days_ago = datetime.utcnow() - timedelta(days=30)
    revenue = db.session.query(db.func.sum(Invoice.amount)).filter(Invoice.date >= thirty_days_ago).scalar() or 0
    
    return render_template('admin/dashboard.html', 
                           total_users=total_users, 
                           total_content=total_content, 
                           recent_signups=recent_signups, 
                           revenue=revenue)

@admin.route('/admin/users')
@login_required
@admin_required
def user_management():
    page = request.args.get('page', 1, type=int)
    users = User.query.paginate(page=page, per_page=20)
    return render_template('admin/user_management.html', users=users)

@admin.route('/admin/user/<int:user_id>', methods=['GET', 'POST'])
@login_required
@admin_required
def user_detail(user_id):
    user = User.query.get_or_404(user_id)
    if request.method == 'POST':
        user.full_name = request.form['full_name']
        user.email = request.form['email']
        user.plan = request.form['plan']
        user.is_admin = 'is_admin' in request.form
        
        if request.form['password']:
            user.password_hash = generate_password_hash(request.form['password'])
        
        db.session.commit()
        flash('User updated successfully', 'success')
        
        log_admin_action(f"Updated user: {user.id}")
        
        return redirect(url_for('admin.user_management'))
    
    return render_template('admin/user_detail.html', user=user)

@admin.route('/admin/user/<int:user_id>/toggle_status', methods=['POST'])
@login_required
@admin_required
def toggle_user_status(user_id):
    user = User.query.get_or_404(user_id)
    user.is_active = not user.is_active
    db.session.commit()
    
    log_admin_action(f"Toggled user status: {user.id}")
    
    return jsonify({'status': 'success', 'is_active': user.is_active})

@admin.route('/admin/content')
@login_required
@admin_required
def content_management():
    page = request.args.get('page', 1, type=int)
    content_type = request.args.get('type')
    user_id = request.args.get('user_id')
    
    query = Content.query
    
    if content_type:
        query = query.filter_by(content_type=content_type)
    if user_id:
        query = query.filter_by(user_id=user_id)
    
    contents = query.paginate(page=page, per_page=20)
    return render_template('admin/content_management.html', contents=contents)

@admin.route('/admin/content/<int:content_id>', methods=['GET', 'POST'])
@login_required
@admin_required
def content_detail(content_id):
    content = Content.query.get_or_404(content_id)
    if request.method == 'POST':
        content.title = request.form['title']
        content.content = request.form['content']
        content.content_type = request.form['content_type']
        db.session.commit()
        flash('Content updated successfully', 'success')
        
        log_admin_action(f"Updated content: {content.id}")
        
        return redirect(url_for('admin.content_management'))
    
    return render_template('admin/content_detail.html', content=content)

@admin.route('/admin/content/<int:content_id>/delete', methods=['POST'])
@login_required
@admin_required
def delete_content(content_id):
    content = Content.query.get_or_404(content_id)
    db.session.delete(content)
    db.session.commit()
    flash('Content deleted successfully', 'success')
    
    log_admin_action(f"Deleted content: {content.id}")
    
    return redirect(url_for('admin.content_management'))

@admin.route('/admin/subscriptions')
@login_required
@admin_required
def subscription_management():
    subscriptions = stripe.Subscription.list()
    return render_template('admin/subscription_management.html', subscriptions=subscriptions)

@admin.route('/admin/subscription/<subscription_id>', methods=['GET', 'POST'])
@login_required
@admin_required
def subscription_detail(subscription_id):
    subscription = stripe.Subscription.retrieve(subscription_id)
    if request.method == 'POST':
        new_plan = request.form['plan']
        stripe.Subscription.modify(
            subscription_id,
            items=[{
                'id': subscription['items']['data'][0].id,
                'price': new_plan,
            }]
        )
        flash('Subscription updated successfully', 'success')
        
        log_admin_action(f"Updated subscription: {subscription_id}")
        
        return redirect(url_for('admin.subscription_management'))
    
    return render_template('admin/subscription_detail.html', subscription=subscription)

@admin.route('/admin/payments')
@login_required
@admin_required
def payment_history():
    page = request.args.get('page', 1, type=int)
    payments = Invoice.query.order_by(desc(Invoice.date)).paginate(page=page, per_page=20)
    return render_template('admin/payment_history.html', payments=payments)

@admin.route('/admin/settings', methods=['GET', 'POST'])
@login_required
@admin_required
def system_settings():
    if request.method == 'POST':
        current_app.config['MAX_CONTENT_LENGTH'] = int(request.form['max_content_length'])
        current_app.config['ALLOWED_CONTENT_TYPES'] = request.form.getlist('allowed_content_types')
        flash('Settings updated successfully', 'success')
        
        log_admin_action("Updated system settings")
        
        return redirect(url_for('admin.system_settings'))
    
    return render_template('admin/system_settings.html')

@admin.route('/admin/analytics')
@login_required
@admin_required
def analytics():
    # User growth
    user_growth = db.session.query(
        db.func.date_trunc('day', User.created_at).label('date'),
        db.func.count(User.id).label('count')
    ).group_by('date').order_by('date').all()
    
    # Content creation
    content_creation = db.session.query(
        db.func.date_trunc('day', Content.created_at).label('date'),
        db.func.count(Content.id).label('count')
    ).group_by('date').order_by('date').all()
    
    # Revenue
    revenue = db.session.query(
        db.func.date_trunc('day', Invoice.date).label('date'),
        db.func.sum(Invoice.amount).label('amount')
    ).group_by('date').order_by('date').all()
    
    return render_template('admin/analytics.html', 
                           user_growth=user_growth, 
                           content_creation=content_creation, 
                           revenue=revenue)

@admin.route('/admin/audit_logs')
@login_required
@admin_required
def audit_logs():
    page = request.args.get('page', 1, type=int)
    logs = AuditLog.query.order_by(desc(AuditLog.timestamp)).paginate(page=page, per_page=20)
    return render_template('admin/audit_logs.html', logs=logs)

@admin.route('/admin/backup', methods=['POST'])
@login_required
@admin_required
def backup_database():
    # This is a placeholder. In a real implementation, you would need to set up a proper backup system.
    # For example, you might use a tool like pg_dump for PostgreSQL or mysqldump for MySQL.
    # You would also need to consider where to store the backup (e.g., Amazon S3).
    flash('Database backup initiated. This may take a few minutes.', 'info')
    
    log_admin_action("Initiated database backup")
    
    return redirect(url_for('admin.system_settings'))

@admin.route('/admin/restore', methods=['POST'])
@login_required
@admin_required
def restore_database():
    # This is a placeholder. In a real implementation, you would need to set up a proper restore system.
    # This is a sensitive operation that requires careful handling and validation of the backup file.
    flash('Database restore initiated. This may take a few minutes.', 'info')
    
    log_admin_action("Initiated database restore")
    
    return redirect(url_for('admin.system_settings'))

@admin.route('/admin/announcements', methods=['GET', 'POST'])
@login_required
@admin_required
def manage_announcements():
    if request.method == 'POST':
        new_announcement = Announcement(
            title=request.form['title'],
            content=request.form['content'],
            start_date=datetime.strptime(request.form['start_date'], '%Y-%m-%d'),
            end_date=datetime.strptime(request.form['end_date'], '%Y-%m-%d')
        )
        db.session.add(new_announcement)
        db.session.commit()
        flash('Announcement created successfully', 'success')
        
        log_admin_action(f"Created announcement: {new_announcement.id}")
        
        return redirect(url_for('admin.manage_announcements'))
    
    announcements = Announcement.query.order_by(desc(Announcement.start_date)).all()
    return render_template('admin/announcements.html', announcements=announcements)

@admin.route('/admin/support_tickets')
@login_required
@admin_required
def support_tickets():
    page = request.args.get('page', 1, type=int)
    status = request.args.get('status')
    
    query = SupportTicket.query
    if status:
        query = query.filter_by(status=status)
    
    tickets = query.order_by(desc(SupportTicket.created_at)).paginate(page=page, per_page=20)
    return render_template('admin/support_tickets.html', tickets=tickets)

@admin.route('/admin/support_ticket/<int:ticket_id>', methods=['GET', 'POST'])
@login_required
@admin_required
def support_ticket_detail(ticket_id):
    ticket = SupportTicket.query.get_or_404(ticket_id)
    if request.method == 'POST':
        ticket.status = request.form['status']
        ticket.admin_response = request.form['admin_response']
        db.session.commit()
        flash('Support ticket updated successfully', 'success')
        
        log_admin_action(f"Updated support ticket: {ticket.id}")
        
        return redirect(url_for('admin.support_tickets'))
    
    return render_template('admin/support_ticket_detail.html', ticket=ticket)

def log_admin_action(action):
    log = AuditLog(admin_id=current_user.id, action=action)
    db.session.add(log)
    db.session.commit()

def init_admin(app):
    app.register_blueprint(admin)

@admin.route('/admin/content/<int:content_id>/delete', methods=['POST'])
@login_required
@admin_required
def delete_content(content_id):
    content = Content.query.get_or_404(content_id)
    db.session.delete(content)
    db.session.commit()
    flash('Content deleted successfully', 'success')
    
    log_admin_action(f"Deleted content: {content.id}")
    
    return redirect(url_for('admin.content_management'))



# This function should be called when setting up the main Flask app
#def init_admin(app):
    #app.register_blueprint(admin)