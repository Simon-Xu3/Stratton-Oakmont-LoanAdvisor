CREATE TABLE IF NOT EXISTS applications (
    id SERIAL PRIMARY KEY,
    applicant_name VARCHAR(100) NOT NULL,
    declared_monthly_income NUMERIC(12, 2) NOT NULL,
    employer_name VARCHAR(150) NOT NULL,
    requested_loan_amount NUMERIC(12, 2) NOT NULL,
    address TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS documents (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    document_type VARCHAR(50) NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    extracted_data JSONB,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS bank_transactions (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    transaction_date DATE NOT NULL,
    description VARCHAR(255),
    amount NUMERIC(12, 2) NOT NULL,
    category VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS verification_results (
    id SERIAL PRIMARY KEY,
    application_id INTEGER REFERENCES applications(id) ON DELETE CASCADE,
    check_name VARCHAR(100) NOT NULL,
    result VARCHAR(30) NOT NULL,
    details TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
