const fs = require('fs');
const path = require('path');
const { spawnSync } = require('child_process');
const { PDFDocument, StandardFonts, rgb } = require('pdf-lib');

const OUTPUT_DIR = path.join(__dirname, '..', 'sample_inputs', 'generated');

const SLIDES = [
  {
    title: 'Slide 1',
    body: 'Product Planning Meeting - Q2 Launch',
  },
  {
    title: 'Slide 2',
    body: 'Agenda\n1. Pricing review\n2. Budget approval\n3. Launch timeline',
  },
  {
    title: 'Slide 3',
    body: 'Current Pricing\nPro plan: $49/month\nTeam plan: $129/month',
  },
  {
    title: 'Slide 4',
    body: 'Budget Discussion\nLaunch budget request: $120,000\nCovers ads, onboarding, and support hiring',
  },
  {
    title: 'Slide 5',
    body: 'Launch Timeline\nInitial proposal: 8 weeks\nDependencies: billing update and QA cycle',
  },
  {
    title: 'Slide 6',
    body: 'Final Decisions\nPricing change approved: $59/month\nTimeline updated to 10 weeks',
  },
];

async function createDeck(outputPath) {
  const pdf = await PDFDocument.create();
  const font = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);

  for (const slide of SLIDES) {
    const page = pdf.addPage([960, 540]);
    page.drawText(slide.title, {
      x: 50,
      y: 470,
      size: 28,
      font: bold,
      color: rgb(0.1, 0.1, 0.1),
    });

    const lines = slide.body.split('\n');
    lines.forEach((line, index) => {
      page.drawText(line, {
        x: 50,
        y: 400 - index * 28,
        size: 18,
        font,
        color: rgb(0.15, 0.15, 0.15),
      });
    });
  }

  const bytes = await pdf.save();
  fs.mkdirSync(path.dirname(outputPath), { recursive: true });
  fs.writeFileSync(outputPath, bytes);
}

function createMedia(outputDir) {
  const scriptPath = path.join(__dirname, 'generate-sample-media.sh');
  const result = spawnSync('bash', [scriptPath, outputDir], { encoding: 'utf8' });

  if (result.status !== 0) {
    throw new Error(result.stderr || 'Failed to generate sample audio/video');
  }
}

async function main() {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });

  const deckPath = path.join(OUTPUT_DIR, 'deck.pdf');
  await createDeck(deckPath);
  createMedia(OUTPUT_DIR);

  const transcriptPath = path.join(OUTPUT_DIR, 'transcript.json');
  const transcript = [
    {
      speaker: 'Speaker 1',
      start: '00:00',
      end: '00:08',
      text: 'Welcome everyone to the Q2 product planning meeting.',
    },
    {
      speaker: 'Speaker 2',
      start: '00:08',
      end: '00:18',
      text: 'On slide three, current pricing is forty nine dollars per month for the pro plan.',
    },
    {
      speaker: 'Speaker 1',
      start: '00:18',
      end: '00:30',
      text: 'When budget came up on slide four, we reviewed the one hundred twenty thousand dollar launch budget.',
    },
    {
      speaker: 'Speaker 3',
      start: '00:30',
      end: '00:42',
      text: 'I disagree with the eight week timeline on slide five. I propose ten weeks instead.',
    },
    {
      speaker: 'Speaker 2',
      start: '00:42',
      end: '00:55',
      text: 'Final decision: move pricing to fifty nine dollars and approve the ten week timeline.',
    },
  ];

  fs.writeFileSync(transcriptPath, JSON.stringify(transcript, null, 2));

  console.log('Sample meeting generated in', OUTPUT_DIR);
}

main().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
