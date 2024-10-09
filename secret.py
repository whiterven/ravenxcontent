import secrets

# Generate a 32-byte (256-bit) random string
secret_key = secrets.token_hex(32)
print(f"Your secret key: {secret_key}")