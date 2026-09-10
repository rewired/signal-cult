export function testPattern() {
    const c = document.createElement('canvas');
    c.width = 1280;
    c.height = 960;
    const x = c.getContext('2d');
    x.fillStyle = '#0b1015';
    x.fillRect(0, 0, 1280, 960);
    x.strokeStyle = '#263339';
    x.lineWidth = 2;
    for (let i = 0; i < 1280; i += 80) {
        x.beginPath();
        x.moveTo(i, 0);
        x.lineTo(i, 960);
        x.stroke();
    }
    for (let i = 0; i < 960; i += 80) {
        x.beginPath();
        x.moveTo(0, i);
        x.lineTo(1280, i);
        x.stroke();
    }
    x.strokeStyle = '#dce7df';
    x.lineWidth = 3;
    x.beginPath();
    x.arc(640, 480, 365, 0, Math.PI * 2);
    x.stroke();
    ['#ededde', '#eded32', '#32e9e9', '#31df55', '#ed3bdb', '#f04438', '#324cf1'].forEach((v, i) => { x.fillStyle = v; x.fillRect(235 + i * 116, 240, 116, 150); });
    x.fillStyle = '#0b1015';
    x.fillRect(170, 423, 940, 153);
    x.fillStyle = '#e4eee4';
    x.font = 'bold 112px Arial';
    x.textAlign = 'center';
    x.fillText('REWIRED', 640, 540);
    x.fillStyle = '#c5f86c';
    x.font = '24px monospace';
    x.fillText('C R T   R E S E A R C H   L A B', 640, 625);
    for (let i = 0; i < 10; i++) {
        x.fillStyle = `rgb(${i * 28},${i * 28},${i * 28})`;
        x.fillRect(235 + i * 81, 700, 81, 65);
    }
    x.fillStyle = '#b1bdb9';
    x.font = '20px monospace';
    x.fillText('SIGNAL 01     /     4:3     /     RGB', 640, 865);
    return c;
}
