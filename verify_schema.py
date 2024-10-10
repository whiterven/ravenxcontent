from app import app, db, User
from sqlalchemy import inspect

def verify_schema():
    with app.app_context():
        inspector = inspect(db.engine)
        tables = inspector.get_table_names()
        print("Tables in the database:", tables)
        
        if 'user' in tables:
            columns = [col['name'] for col in inspector.get_columns('user')]
            print("Columns in the user table:", columns)
        else:
            print("User table not found in the database.")

if __name__ == "__main__":
    verify_schema()