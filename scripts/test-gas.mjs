
const API_BASE = 'https://script.google.com/macros/s/AKfycby6x7sGLKNAbc9ZXhlLniKHiblTQkAkmrsd13IiCim7cRDFyI3zuZC6LlOdUp2VoRLB/exec';

async function testFetch() {
    try {
        console.log('Fetching data...');
        const response = await fetch(API_BASE + '?limit=10', {
            method: 'GET',
        });

        console.log('Status:', response.status);
        if (response.ok) {
            const data = await response.json();
            console.log('Raw Data Sample (first 2):', JSON.stringify(data.entries.slice(0, 2), null, 2));

            // Simulate the mapping logic
            const mapped = data.entries.map(entry => ({
                original: entry,
                mappedName: entry.player || entry.name || entry.playerName || 'MISSING'
            }));

            console.log('Mapping Check:');
            mapped.forEach((m, i) => {
                console.log(`[${i}] Name: ${m.mappedName} (Keys: ${Object.keys(m.original).join(', ')})`);
            });

        } else {
            console.log('Text:', await response.text());
        }
    } catch (e) {
        console.error('Error:', e);
    }
}

testFetch();
