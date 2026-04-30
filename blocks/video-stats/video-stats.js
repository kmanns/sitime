export default async function decorate(block) {
  const rows = [...block.children];

  // Row 1: Video + Description
  if (rows[0]) {
    const cells = [...rows[0].children];
    // First cell contains a link to the video - convert to actual video element
    if (cells[0]) {
      const link = cells[0].querySelector('a');
      if (link && link.href.endsWith('.mp4')) {
        const videoUrl = link.href;
        const video = document.createElement('video');
        video.setAttribute('width', '100%');
        video.setAttribute('controls', '');
        video.setAttribute('loop', '');
        video.setAttribute('autoplay', '');
        video.setAttribute('muted', '');
        video.style.pointerEvents = 'none';

        const source = document.createElement('source');
        source.setAttribute('src', videoUrl);
        source.setAttribute('type', 'video/mp4');
        video.appendChild(source);

        cells[0].innerHTML = '';
        cells[0].appendChild(video);
      }
    }
  }
}
