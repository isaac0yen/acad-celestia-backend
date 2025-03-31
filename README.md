# Acad Celestia Backend

A modern REST API built with Node.js, Express, and MySQL.

## Description

Acad Celestia is a cutting-edge software solution designed to empower universities by streamlining academic activities and resource management. It leverages the power of Artificial Intelligence (AI) and blockchain technology to foster a more interactive and efficient ecosystem for both universities and students.

## Features

- **User Authentication**: Multi-layered verification system for Nigerian students
- **Token Market**: University-specific tokens with dynamic valuation
- **Gaming Platform**: Interactive games with token staking
- **Wallet Management**: Track balances and transaction history

## Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/acad-celestia-backend.git
cd acad-celestia-backend
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file based on `.env.example`:
```bash
cp .env.example .env
# Edit the .env file with your database credentials
```

4. Set up MySQL database:
```bash
# Create a database named 'acad_celestia' or as specified in your .env
mysql -u root -p
CREATE DATABASE acad_celestia;
```

5. Start the server:
```bash
npm run dev
```

Visit http://localhost:3000/api-docs for interactive API documentation.

## API Endpoints

### Authentication
- `GET /api/institutions` - Get list of Nigerian institutions
- `POST /api/auth/verify` - Verify user using JAMB details and create account
- `GET /api/me` - Get current user details

### Wallet
- `GET /api/me/wallet` - Get user's wallet
- `GET /api/me/transactions` - Get user's transaction history

### Token Market
- `POST /api/token/buy` - Buy tokens
- `POST /api/token/sell` - Sell tokens
- `GET /api/token/market/:institutionCode` - Get token market statistics

### Games
- `POST /api/games/play` - Play a game
- `GET /api/games/history` - Get user's game history

## Tech Stack

- **Node.js** - JavaScript runtime
- **Express** - Web framework
- **MySQL** - Database
- **Sequelize** - ORM
- **JWT** - Authentication
- **Swagger** - API documentation
