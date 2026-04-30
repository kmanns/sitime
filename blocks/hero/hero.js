export default async function decorate(block) {
  const rows = [...block.children];

  // Row 1: Hero image + text overlay
  if (rows[0]) {
    const cells = [...rows[0].children];
    // First cell is image, second is text content
    if (cells[0]) {
      cells[0].classList.add('hero-image');
    }
    if (cells[1]) {
      cells[1].classList.add('hero-content');
    }
  }

  // Row 2: AI Assistant panel
  if (rows[1]) {
    rows[1].classList.add('hero-ai-panel');
  }

  // Row 3: News ticker
  if (rows[2]) {
    rows[2].classList.add('hero-notify');
  }
}
