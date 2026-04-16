function enterGame() {
    // Select the container to apply a fade-out effect
    const container = document.querySelector('.landing-container');
    
    // Start the transition
    container.style.transition = 'opacity 0.8s ease, transform 0.8s ease';
    container.style.opacity = '0';
    container.style.transform = 'scale(1.1)';

    // Wait for the animation to finish, then change page
    setTimeout(() => {
        window.location.href = 'index.html';
    }, 800);
}
