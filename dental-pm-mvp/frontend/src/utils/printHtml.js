export const renderHtmlInPopup = (popup, html) => {
  const blobUrl = URL.createObjectURL(new Blob([html], { type: 'text/html;charset=utf-8' }));
  popup.opener = null;
  popup.location.replace(blobUrl);
  popup.focus();
  window.setTimeout(() => URL.revokeObjectURL(blobUrl), 60_000);
};
