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

# Helper function to get authenticated user
def get_current_user():
    if 'user_id' not in session:
        return None
    return User.query.get(session['user_id'])

# Routes
@app.route('/')
def home():
    return render_template('home.html')

@app.route('/casino')
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
            return jsonify({'success': True, 'balance': user.balance, 'redirect': '/casino'})
        
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
    
    return jsonify({'success': True, 'balance': user.balance, 'redirect': '/casino'})

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

@app.route('/api/balance')
def get_balance():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = User.query.get(session['user_id'])
    if not user:
        session.clear()
        return jsonify({'error': 'User not found'}), 401
    
    return jsonify({'balance': user.balance})

@app.route('/api/history')
def get_history():
    if 'user_id' not in session:
        return jsonify({'error': 'Not authenticated'}), 401
    
    user = User.query.get(session['user_id'])
    if not user:
        session.clear()
        return jsonify({'error': 'User not found'}), 401
    
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
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    bet_amount = float(data['bet'])
    risk_level = data.get('risk', 'medium')
    
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
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    bet_amount = float(data['bet'])
    cashout_multiplier = float(data.get('autoCashout', 2.0))
    
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
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    bet_amount = float(data['bet'])
    target = float(data['target'])
    over = data.get('over', True)
    
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
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    action = data['action']
    
    if action == 'start':
        bet_amount = float(data['bet'])
        num_mines = int(data.get('mines', 3))
        
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
            user = get_current_user()
            if not user:
                return jsonify({'error': 'Not authenticated'}), 401
            
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
        
        user = get_current_user()
        if not user:
            return jsonify({'error': 'Not authenticated'}), 401
        
        game = session['mines_game']
        gems_found = len(game['revealed'])
        
        # Calculate final multiplier
        multiplier = 1.0
        for i in range(gems_found):
            multiplier *= (25 - game['num_mines'] - i) / (25 - i)
        
        multiplier = round(1.0 / (multiplier * 0.97), 2)
        
        win_amount = game['bet'] * multiplier
        
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

# Game: Pump
@app.route('/api/play/pump', methods=['POST'])
def play_pump():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    action = data['action']
    
    if action == 'start':
        bet_amount = float(data['bet'])
        
        if user.balance < bet_amount:
            return jsonify({'error': 'Insufficient balance'}), 400
        
        # Generate random max multiplier (pop point)
        max_mult = round(1.0 + random.expovariate(0.5), 2)
        max_mult = min(max_mult, 50.0)
        
        session['pump_game'] = {
            'bet': bet_amount,
            'max_multiplier': max_mult
        }
        
        user.balance -= bet_amount
        db.session.commit()
        
        return jsonify({
            'success': True,
            'maxMultiplier': max_mult,
            'balance': user.balance
        })
    
    elif action == 'pop':
        if 'pump_game' not in session:
            return jsonify({'error': 'No active game'}), 400
        
        game = session['pump_game']
        
        transaction = Transaction(
            user_id=user.id,
            game='pump',
            bet_amount=game['bet'],
            win_amount=0,
            multiplier=0
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        del session['pump_game']
        
        return jsonify({'balance': user.balance})
    
    elif action == 'cashout':
        if 'pump_game' not in session:
            return jsonify({'error': 'No active game'}), 400
        
        game = session['pump_game']
        multiplier = float(data['multiplier'])
        win_amount = game['bet'] * multiplier
        
        user.balance += win_amount
        
        transaction = Transaction(
            user_id=user.id,
            game='pump',
            bet_amount=game['bet'],
            win_amount=win_amount,
            multiplier=multiplier
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        del session['pump_game']
        
        return jsonify({
            'win': win_amount,
            'multiplier': multiplier,
            'balance': user.balance
        })

# Game: Limbo
@app.route('/api/play/limbo', methods=['POST'])
def play_limbo():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    bet_amount = float(data['bet'])
    target = float(data['target'])
    
    if user.balance < bet_amount:
        return jsonify({'error': 'Insufficient balance'}), 400
    
    # Generate result with weighted probability (harder for high multipliers)
    # Use exponential distribution for realistic casino odds
    rand_value = random.random()
    
    # Transform to make high values rare
    if rand_value < 0.5:
        # 50% chance of 1-2x
        result = round(1.0 + rand_value * 2, 2)
    elif rand_value < 0.8:
        # 30% chance of 2-5x
        result = round(2.0 + (rand_value - 0.5) * 10, 2)
    elif rand_value < 0.95:
        # 15% chance of 5-20x
        result = round(5.0 + (rand_value - 0.8) * 100, 2)
    else:
        # 5% chance of 20-100x
        result = round(20.0 + (rand_value - 0.95) * 1600, 2)
    
    result = min(result, 100.0)  # Cap at 100x
    
    won = result >= target
    
    if won:
        multiplier = target
        win_amount = bet_amount * multiplier
    else:
        multiplier = 0
        win_amount = 0
    
    user.balance -= bet_amount
    user.balance += win_amount
    
    transaction = Transaction(
        user_id=user.id,
        game='limbo',
        bet_amount=bet_amount,
        win_amount=win_amount,
        multiplier=multiplier
    )
    
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({
        'result': result,
        'won': won,
        'multiplier': multiplier,
        'win': win_amount,
        'balance': user.balance
    })

# Game: Roulette
@app.route('/api/play/roulette', methods=['POST'])
def play_roulette():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    bet_amount = float(data['bet'])
    bet_type = data['betType']
    
    if user.balance < bet_amount:
        return jsonify({'error': 'Insufficient balance'}), 400
    
    # Roulette numbers
    red_numbers = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36]
    black_numbers = [2,4,6,8,10,11,13,15,17,20,22,24,26,28,29,31,33,35]
    
    # Spin wheel
    number = random.randint(0, 36)
    
    won = False
    
    if bet_type == 'red' and number in red_numbers:
        won = True
    elif bet_type == 'black' and number in black_numbers:
        won = True
    elif bet_type == 'even' and number > 0 and number % 2 == 0:
        won = True
    elif bet_type == 'odd' and number % 2 == 1:
        won = True
    elif bet_type == 'low' and 1 <= number <= 18:
        won = True
    elif bet_type == 'high' and 19 <= number <= 36:
        won = True
    
    if won:
        multiplier = 2.0
        win_amount = bet_amount * multiplier
    else:
        multiplier = 0
        win_amount = 0
    
    user.balance -= bet_amount
    user.balance += win_amount
    
    transaction = Transaction(
        user_id=user.id,
        game='roulette',
        bet_amount=bet_amount,
        win_amount=win_amount,
        multiplier=multiplier
    )
    
    db.session.add(transaction)
    db.session.commit()
    
    return jsonify({
        'number': number,
        'won': won,
        'multiplier': multiplier,
        'win': win_amount,
        'balance': user.balance
    })

# Game: BlackJack
@app.route('/api/play/blackjack', methods=['POST'])
def play_blackjack():
    user = get_current_user()
    if not user:
        return jsonify({'error': 'Not authenticated'}), 401
    
    data = request.json
    action = data['action']
    
    if action == 'deal':
        bet_amount = float(data['bet'])
        
        if user.balance < bet_amount:
            return jsonify({'error': 'Insufficient balance'}), 400
        
        # Create deck
        suits = ['♠', '♥', '♦', '♣']
        ranks = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
        deck = [f"{rank}{suit}" for suit in suits for rank in ranks]
        random.shuffle(deck)
        
        # Deal cards
        player_hand = [deck.pop(), deck.pop()]
        dealer_hand = [deck.pop(), deck.pop()]
        
        session['blackjack_game'] = {
            'bet': bet_amount,
            'deck': deck,
            'player_hand': player_hand,
            'dealer_hand': dealer_hand
        }
        
        user.balance -= bet_amount
        db.session.commit()
        
        player_score = calculate_blackjack_score(player_hand)
        dealer_score = calculate_blackjack_score([dealer_hand[0]])
        
        return jsonify({
            'playerHand': player_hand,
            'dealerHand': dealer_hand,
            'playerScore': player_score,
            'dealerScore': dealer_score,
            'balance': user.balance
        })
    
    elif action == 'hit':
        if 'blackjack_game' not in session:
            return jsonify({'error': 'No active game'}), 400
        
        game = session['blackjack_game']
        game['player_hand'].append(game['deck'].pop())
        session['blackjack_game'] = game
        
        player_score = calculate_blackjack_score(game['player_hand'])
        dealer_score = calculate_blackjack_score([game['dealer_hand'][0]])
        
        game_over = player_score > 21
        
        result_data = {
            'playerHand': game['player_hand'],
            'dealerHand': game['dealer_hand'],
            'playerScore': player_score,
            'dealerScore': dealer_score,
            'gameOver': game_over
        }
        
        if game_over:
            # Player busts
            transaction = Transaction(
                user_id=user.id,
                game='blackjack',
                bet_amount=game['bet'],
                win_amount=0,
                multiplier=0
            )
            
            db.session.add(transaction)
            db.session.commit()
            
            del session['blackjack_game']
            
            result_data['result'] = 'lose'
            result_data['win'] = 0
            result_data['balance'] = user.balance
        
        return jsonify(result_data)
    
    elif action == 'stand':
        if 'blackjack_game' not in session:
            return jsonify({'error': 'No active game'}), 400
        
        game = session['blackjack_game']
        
        # Dealer plays
        while calculate_blackjack_score(game['dealer_hand']) < 17:
            game['dealer_hand'].append(game['deck'].pop())
        
        player_score = calculate_blackjack_score(game['player_hand'])
        dealer_score = calculate_blackjack_score(game['dealer_hand'])
        
        # Determine winner
        if dealer_score > 21:
            result = 'win'
            multiplier = 2.0
        elif player_score > dealer_score:
            result = 'win'
            multiplier = 2.0
        elif player_score < dealer_score:
            result = 'lose'
            multiplier = 0
        else:
            result = 'push'
            multiplier = 1.0
        
        win_amount = game['bet'] * multiplier
        user.balance += win_amount
        
        transaction = Transaction(
            user_id=user.id,
            game='blackjack',
            bet_amount=game['bet'],
            win_amount=win_amount,
            multiplier=multiplier
        )
        
        db.session.add(transaction)
        db.session.commit()
        
        del session['blackjack_game']
        
        return jsonify({
            'playerHand': game['player_hand'],
            'dealerHand': game['dealer_hand'],
            'playerScore': player_score,
            'dealerScore': dealer_score,
            'result': result,
            'win': win_amount,
            'multiplier': multiplier,
            'balance': user.balance,
            'gameOver': True
        })

def calculate_blackjack_score(hand):
    score = 0
    aces = 0
    
    for card in hand:
        rank = card[:-1]
        if rank in ['J', 'Q', 'K']:
            score += 10
        elif rank == 'A':
            aces += 1
            score += 11
        else:
            score += int(rank)
    
    # Adjust for aces
    while score > 21 and aces > 0:
        score -= 10
        aces -= 1
    
    return score

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.environ.get('PORT', 5000)), debug=False)
