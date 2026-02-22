function toggleCard(header) {
  const body = header.nextElementSibling;
  const chevron = header.querySelector('.update-chevron');
  const isOpen = body.classList.contains('open');

  body.classList.toggle('open', !isOpen);
  chevron.classList.toggle('open', !isOpen);
}
