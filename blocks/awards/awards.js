export default async function decorate(block) {
  // The block structure is already: rows with [image-cell, text-cell]
  // No additional DOM manipulation needed
  const rows = [...block.children];
  rows.forEach((row) => {
    row.classList.add('award-item');
  });
}
