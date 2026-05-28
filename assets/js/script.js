console.log("Quest Log loaded successfully!");

document.addEventListener('DOMContentLoaded', () => {
    const cards = document.querySelectorAll('.quest-card');

    // 1. Staggered Entrance Animation
    cards.forEach((card, index) => {
        card.style.opacity = '0';
        card.style.transform = 'translateY(30px)';
        
        setTimeout(() => {
            card.style.transition = 'all 0.6s cubic-bezier(0.175, 0.885, 0.32, 1.275)';
            card.style.opacity = '1';
            card.style.transform = 'translateY(0)';
        }, index * 150);
    });

    // 2. Glow Interaction
    cards.forEach(card => {
        const btn = card.querySelector('.btn');
        const btnColor = getComputedStyle(btn).borderColor;

        card.addEventListener('mouseenter', () => {
            card.style.setProperty('--glow-color', btnColor);
            card.classList.add('is-active');
        });

        card.addEventListener('mouseleave', () => {
            card.classList.remove('is-active');
        });
    });

    console.log("Neon HUD: Systems Online. Glow-engine & Entrance sequence active.");
});