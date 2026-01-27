from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from flask_sqlalchemy import SQLAlchemy
from werkzeug.security import generate_password_hash, check_password_hash
import os
import random
from datetime import datetime

app = Flask(__name__)
app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
app.config['SQLALCHEMY_DATABASE_URI'] = os.environ.get('DATABASE_URL', 'sqlite:///casino.db')
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db = SQLAlchemy(app)

# Models
class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    username = db.Column(db.String(80), unique=True, nullable=False)
    password_hash = db.Column(db.String(200), nullable=False)
    balance = db.Column(db.Float, default=1000.0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)
    
    def set_password(self, password):
        self.password_hash = generate_password_hash(password)
    
    def check_password(self, password):
        return check_password_hash(self.password_hash, password)

class Transaction(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    user_id = db.Column(db.Integer, db.ForeignKey('user.id'), nullable=False)
    game = db.Column(db.String(50), nullable=False)
    bet_amount = db.Column(db.Float, nullable=False)
    win_amount = db.Column(db.Float, nullable=False)
    multiplier = db.Column(db.Float, default=0)
    created_at = db.Column(db.DateTime, default=datetime.utcnow)

# Create tables
with app.app_context():
    db.create_all()

# Routes
@app.route('/')
def index():
    if 'user_id' not in session:
        return redirect(url_for('login'))
    return render_template('index.html')

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        data = request.json
        user = User.query.filter_by(username=data['username']).first()
        
        if user and user.check_password(data['password']):
            session['user_id'] = user.id
            session['username'] = user.username
            return jsonify({'success': True, 'balance': user.balance})
        
        return jsonify({'success': False, 'message': 'Invalid credentials'}), 401
    
    return render_template('login.html')

@app.route('/register', methods=['POST'])
def register():
    data = request.json
    
    if User.query.filter_by(username=data['username']).first():
        return jsonify({'success': False, 'message': 'Username already exists'}), 400
    
    user = User(username=data['username'])
    user.set_password(data['password'])
    user.balance = 1000.0
    
    db.session.add(user)
    db.session.commit()
    
    session['user_id'] = user.id
    session['username'] = user.username
    
    return jsonify({'success': True, 'balance': user.balance})

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/api/balance')
def get_balance():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = User.query.get(session['user_id'])
    return jsonify({'balance': user.balance})

@app.route('/api/history')
def get_history():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    transactions = Transaction.query.filter_by(user_id=session['user_id'])\
        .order_by(Transaction.created_at.desc()).limit(50).all()
    
    return jsonify([{
        'game': t.game,
        'bet': t.bet_amount,
        'win': t.win_amount,
        'multiplier': t.multiplier,
        'profit': t.win_amount - t.bet_amount,
        'time': t.created_at.isoformat()
    } for t in transactions])

# Game: Plinko
@app.route('/api/play/plinko', methods=['POST'])
def play_plinko():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    bet_amount = float(data['bet'])
    risk_level = data.get('risk', 'medium')
    
    user = User.query.get(session['user_id'])
    
    if user.balance < bet_amount:
        return jsonify({'error': 'Insufficient balance'}), 400
    
    # Plinko multipliers based on risk
    multipliers = {
        'low': [0.5, 0.7, 0.9, 1.0, 1.1, 1.3, 1.5, 1.3, 1.1, 1.0, 0.9, 0.7, 0.5],
        'medium': [0.3, 0.5, 0.7, 1.0, 1.5, 2.0, 3.0, 2.0, 1.5, 1.0, 0.7, 0.5, 0.3],
        'high': [0.2, 0.3, 0.5, 1.0, 2.0, 5.0, 10.0, 5.0, 2.0, 1.0, 0.5, 0.3, 0.2]
    }
    
    # Simulate ball path (16 rows)
    path = []
    position = 8
    for row in range(16):
        direction = random.choice([-1, 1])
        position = max(0, min(12, position + direction))
        path.append(position)
    
    final_position = path[-1]
    multiplier = multipliers[risk_level][final_position]
    win_amount = bet_amount * multiplier
    
    user.balance -= bet_amount
    user.balance += win_amount
    
    transaction = Transaction(
        user_id=user.id,
        game='plinko',
        bet_amount=bet_amount,
        win_amount=win_amount,
        multiplier=multiplier
    )
    
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({
        'path': path,
        'multiplier': multiplier,
        'win': win_amount,
        'balance': user.balance
    })

# Game: Crash
@app.route('/api/play/crash', methods=['POST'])
def play_crash():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    bet_amount = float(data['bet'])
    cashout_multiplier = float(data.get('autoCashout', 2.0))
    
    user = User.query.get(session['user_id'])
    
    if user.balance < bet_amount:
        return jsonify({'error': 'Insufficient balance'}), 400
    
    # Generate crash point (weighted towards lower values)
    crash_point = round(1.0 / (1.0 - random.random() ** 2), 2)
    crash_point = min(crash_point, 100.0)
    
    # Generate crash path
    path = []
    current = 1.0
    step = 0.01
    while current < crash_point:
        path.append(round(current, 2))
        current += step
        if current > 2.0:
            step = 0.05
        if current > 5.0:
            step = 0.1
    
    path.append(crash_point)
    
    # Determine if player wins
    if cashout_multiplier <= crash_point:
        multiplier = cashout_multiplier
        win_amount = bet_amount * multiplier
        won = True
    else:
        multiplier = 0
        win_amount = 0
        won = False
    
    user.balance -= bet_amount
    user.balance += win_amount
    
    transaction = Transaction(
        user_id=user.id,
        game='crash',
        bet_amount=bet_amount,
        win_amount=win_amount,
        multiplier=multiplier
    )
    
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({
        'crashPoint': crash_point,
        'path': path,
        'won': won,
        'multiplier': multiplier,
        'win': win_amount,
        'balance': user.balance
    })

# Game: Dice
@app.route('/api/play/dice', methods=['POST'])
def play_dice():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    bet_amount = float(data['bet'])
    target = float(data['target'])
    over = data.get('over', True)
    
    user = User.query.get(session['user_id'])
    
    if user.balance < bet_amount:
        return jsonify({'error': 'Insufficient balance'}), 400
    
    # Roll dice (0-100)
    roll = round(random.uniform(0, 100), 2)
    
    # Calculate win chance and multiplier
    if over:
        win_chance = 100 - target
        won = roll > target
    else:
        win_chance = target
        won = roll < target
    
    multiplier = (98.0 / win_chance) if win_chance > 0 else 0
    
    if won:
        win_amount = bet_amount * multiplier
    else:
        win_amount = 0
        multiplier = 0
    
    user.balance -= bet_amount
    user.balance += win_amount
    
    transaction = Transaction(
        user_id=user.id,
        game='dice',
        bet_amount=bet_amount,
        win_amount=win_amount,
        multiplier=multiplier
    )
    
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({
        'roll': roll,
        'won': won,
        'multiplier': round(multiplier, 2),
        'win': win_amount,
        'balance': user.balance,
        'winChance': round(win_chance, 2)
    })

# Game: Mines
@app.route('/api/play/mines', methods=['POST'])
def play_mines():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    action = data['action']
    
    if action == 'start':
        bet_amount = float(data['bet'])
        num_mines = int(data.get('mines', 3))
        
        user = User.query.get(session['user_id'])
        
        if user.balance < bet_amount:
            return jsonify({'error': 'Insufficient balance'}), 400
        
        # Generate mine positions (5x5 grid)
        all_positions = list(range(25))
        mine_positions = random.sample(all_positions, num_mines)
        
        session['mines_game'] = {
            'bet': bet_amount,
            'mines': mine_positions,
            'revealed': [],
            'num_mines': num_mines
        }
        
        user.balance -= bet_amount
        db.session.commit()
        
        return jsonify({'success': True, 'balance': user.balance})
    
    elif action == 'reveal':
        if 'mines_game' not in session:
            return jsonify({'error': 'No active game'}), 400
        
        position = int(data['position'])
        game = session['mines_game']
        
        if position in game['revealed']:
            return jsonify({'error': 'Already revealed'}), 400
        
        game['revealed'].append(position)
        
        if position in game['mines']:
            # Hit a mine - game over
            user = User.query.get(session['user_id'])
            
            transaction = Transaction(
                user_id=user.id,
                game='mines',
                bet_amount=game['bet'],
                win_amount=0,
                multiplier=0
            )
            
            db.session.add(transaction)
            db.session.commit()
            
            del session['mines_game']
            
            return jsonify({
                'hit': True,
                'gameOver': True,
                'mines': game['mines'],
                'balance': user.balance
            })
        else:
            # Safe tile
            gems_found = len(game['revealed'])
            total_safe = 25 - game['num_mines']
            
            # Calculate current multiplier
            multiplier = 1.0
            for i in range(gems_found):
                multiplier *= (25 - game['num_mines'] - i) / (25 - i)
            
            multiplier = round(1.0 / (multiplier * 0.97), 2)
            
            session['mines_game'] = game
            
            return jsonify({
                'hit': False,
                'multiplier': multiplier,
                'gemsFound': gems_found
            })
    
    elif action == 'cashout':
        if 'mines_game' not in session:
            return jsonify({'error': 'No active game'}), 400
        
        game = session['mines_game']
        gems_found = len(game['revealed'])
        
        # Calculate final multiplier
        multiplier = 1.0
        for i in range(gems_found):
            multiplier *= (25 - game['num_mines'] - i) / (25 - i)
        
        multiplier = round(1.0 / (multiplier * 0.97), 2)
        
        win_amount = game['bet'] * multiplier
        
        user = User.query.get(session['user_id'])
        user.balance += win_amount
        
        transaction = Transaction(
            user_id=user.id,
            game='mines',
            bet_amount=game['bet'],
            win_amount=win_amount,
            multiplier=multiplier
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        mines = game['mines']
        del session['mines_game']
        
        return jsonify({
            'win': win_amount,
            'multiplier': multiplier,
            'mines': mines,
            'balance': user.balance
        })

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
