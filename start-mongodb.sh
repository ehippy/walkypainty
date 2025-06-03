#!/bin/bash

# Check if MongoDB is installed
if ! command -v mongod &> /dev/null; then
    echo "MongoDB is not installed. Please install MongoDB first."
    echo "You can install it using Homebrew: brew install mongodb-community"
    exit 1
fi

# Create data directory if it doesn't exist
mkdir -p ./data/db

# Start MongoDB with the data directory
mongod --dbpath ./data/db
