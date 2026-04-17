// Fixture Card Renderer - Dynamically builds match cards from fixtures.json
document.addEventListener('DOMContentLoaded', async () => {
    const grid = document.querySelector('.fixtures-grid');
    if (!grid) return;

    try {
        const res = await fetch('assets/data/fixtures.json');
        const matches = await res.json();

        matches.forEach(m => {
            const teamName = (name) => name.replace(' ', '<br>');
            
            const card = document.createElement('div');
            card.className = 'ticket-card';
            card.innerHTML = `
                <div class="t-left">
                    <h3 class="t-month">${m.month}</h3>
                    <h2 class="t-date">${m.date}</h2>
                    <div class="t-divider"></div>
                    <span class="t-match-name">Match ${m.match}</span>
                </div>
                <div class="t-vs-logo"></div>
                <div class="t-right">
                    <div class="t-time-badge">
                        <div class="time-main-block"><span class="time-val">${m.time}</span></div>
                        <div class="time-stripe"></div>
                        <div class="time-stripe"></div>
                    </div>
                    <div class="t-matchup-area">
                        <div class="t-team-block">
                            <div class="t-logo-holder"><img src="assets/img/teams/Teams-Logo/${m.team1_logo}" alt="${m.team1}"></div>
                            <span class="t-name">${teamName(m.team1)}</span>
                        </div>
                        <div class="t-team-block">
                            <div class="t-logo-holder"><img src="assets/img/teams/Teams-Logo/${m.team2_logo}" alt="${m.team2}"></div>
                            <span class="t-name">${teamName(m.team2)}</span>
                        </div>
                    </div>
                    <div class="t-footer"><a href="#" class="mc-btn">${m.venue}</a></div>
                </div>
            `;
            grid.appendChild(card);
        });
    } catch (err) {
        console.error('Failed to load fixtures:', err);
    }
});
