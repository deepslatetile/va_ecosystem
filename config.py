import os

def init_app(app):
    app.secret_key = os.getenv('SECRET_KEY')

    app.config['SOCIALNWK_CLIENT_ID'] = os.getenv('SOCIALNWK_CLIENT_ID')
    app.config['SOCIALNWK_CLIENT_SECRET'] = os.getenv('SOCIALNWK_CLIENT_SECRET')
    app.config['SOCIALNWK_REDIRECT_URI'] = os.getenv('SOCIALNWK_REDIRECT_URI')
    app.config['SOCIALNWK_AUTH_URL'] = os.getenv('SOCIALNWK_AUTH_URL')

    app.config['VIRTUALNWK_CLIENT_ID'] = os.getenv('VIRTUALNWK_CLIENT_ID')
    app.config['VIRTUALNWK_CLIENT_SECRET'] = os.getenv('VIRTUALNWK_CLIENT_SECRET')
    app.config['VIRTUALNWK_REDIRECT_URI'] = os.getenv('VIRTUALNWK_REDIRECT_URI')
    app.config['VIRTUALNWK_AUTH_URL'] = os.getenv('VIRTUALNWK_AUTH_URL')
    app.config['VIRTUALNWK_TOKEN_URL'] = os.getenv('VIRTUALNWK_TOKEN_URL')
    app.config['VIRTUALNWK_API_URL'] = os.getenv('VIRTUALNWK_API_URL')

    app.config['DEPARTURE_API_KEY'] = os.getenv('24DEPARTURE_API_KEY')
    app.config['DEPARTURE_API_URL'] = 'https://24departure.pythonanywhere.com'

    app.config['DEBUG'] = os.getenv('DEBUG', 'False').lower() == 'true'
    app.config['PORT'] = int(os.getenv('PORT', 2121))
    app.config['DATABASE_URL'] = os.getenv('DATABASE_URL')

    from flask_cors import CORS
    CORS(app, resources={
        r"/*": {
            "origins": ["http://127.0.0.1:2121", "http://localhost:2121", "https://aurus.pythonanywhere.com"],
            "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
            "allow_headers": ["Content-Type", "Authorization"]
        }
    })

    return app
