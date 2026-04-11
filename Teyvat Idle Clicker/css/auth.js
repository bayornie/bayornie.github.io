.auth-overlay {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 100%;
    background: rgba(0, 0, 0, 0.88);
    backdrop-filter: blur(12px);
    display: none;
    justify-content: center;
    align-items: center;
    z-index: 9999;
    margin: 0;
    padding: 0;
    box-sizing: border-box;
}

.auth-card {
    background: rgba(17, 24, 39, 0.95);
    padding: 2.5rem;
    border-radius: 12px;
    border: 2px solid var(--neon-blue);
    width: 400px;
    color: white;
    text-align: center;
    box-shadow: 0 0 30px rgba(110, 231, 183, 0.3);
    display: flex;
    flex-direction: column;
    align-items: center;
}

.auth-card input {
    width: 100%;
    max-width: 100%;
    margin-bottom: 1.2rem;
    padding: 14px 18px;
    background: rgba(0, 0, 0, 0.4);
    border: 1px solid rgba(110, 231, 183, 0.2);
    border-radius: 8px;
    color: white;
    font-size: 1rem;
    transition: all 0.2s;
    box-sizing: border-box;
}

.auth-card input:focus {
    outline: none;
    border-color: var(--neon-blue);
    box-shadow: 0 0 15px rgba(110, 231, 183, 0.4);
}

.auth-btn {
    width: 100%;
    padding: 14px;
    background: var(--neon-blue);
    color: #111827;
    border: none;
    border-radius: 8px;
    font-weight: 800;
    font-size: 1.1rem;
    cursor: pointer;
    transition: all 0.2s;
    margin-top: 10px;
    box-shadow: 0 0 15px rgba(110, 231, 183, 0.3);
    text-transform: uppercase;
    letter-spacing: 1px;
    box-sizing: border-box;
}

.auth-btn:hover {
    background: white;
    box-shadow: 0 0 25px rgba(110, 231, 183, 0.6);
    transform: translateY(-2px);
}

.auth-card p {
    color: rgba(255, 255, 255, 0.6);
    font-size: 0.9rem;
    margin-top: 20px;
    cursor: pointer;
    transition: all 0.3s ease;
    letter-spacing: 1px;
    text-transform: none;
    display: inline-block;
    border-bottom: 1px solid transparent;
    padding-bottom: 2px;
}

.auth-card p:hover {
    color: var(--neon-blue);
    text-shadow: 0 0 10px rgba(110, 231, 183, 0.4);
    border-bottom: 1px solid var(--neon-blue);
}
