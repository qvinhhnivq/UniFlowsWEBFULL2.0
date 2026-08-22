/**
 * UNIFLOWS CONTENT SECURITY & ANTI-COPY PROTECTION ENGINE
 * Prevents unauthorized text selection, right-click, keyboard copy shortcuts,
 * image/audio dragging, and inspect source actions.
 */

(function initUniSecurity() {
  // 1. Disable Right Click Context Menu
  document.addEventListener('contextmenu', (e) => {
    // Allow right click ONLY on standard input/textarea if user is editing their own text
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA')) {
      return;
    }
    e.preventDefault();
    showSecurityToast('🔒 Nội dung & âm nhạc được bảo vệ bản quyền bởi UniFLOWs. Thao tác chuột phải đã bị vô hiệu hóa.');
    return false;
  }, { capture: true });

  // 2. Disable Keyboard Shortcuts (Ctrl+C, Cmd+C, Ctrl+X, Cmd+X, Ctrl+U, Cmd+U, Ctrl+S, Cmd+S, F12, DevTools)
  document.addEventListener('keydown', (e) => {
    const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
    const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;
    const key = e.key ? e.key.toLowerCase() : '';

    // Allow typing in text inputs/textareas
    const isInputField = e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable);

    // Block Save page (Ctrl+S / Cmd+S)
    if (ctrlOrCmd && key === 's') {
      e.preventDefault();
      showSecurityToast('🔒 Chức năng lưu trang web đã bị vô hiệu hóa.');
      return false;
    }

    // Block View Source (Ctrl+U / Cmd+U)
    if (ctrlOrCmd && key === 'u') {
      e.preventDefault();
      showSecurityToast('🔒 Chức năng xem mã nguồn đã bị vô hiệu hóa.');
      return false;
    }

    // Block Copy / Cut if outside legitimate input field
    if (ctrlOrCmd && (key === 'c' || key === 'x') && !isInputField) {
      e.preventDefault();
      showSecurityToast('🔒 Nội dung trang web được bảo vệ bản quyền. Nghiêm cấm sao chép.');
      return false;
    }

    // Block F12 and DevTools shortcuts (Ctrl+Shift+I, Cmd+Option+I, Cmd+Option+J, Cmd+Option+C)
    if (
      e.keyCode === 123 || // F12
      (ctrlOrCmd && e.shiftKey && (key === 'i' || key === 'j' || key === 'c')) ||
      (isMac && e.metaKey && e.altKey && (key === 'i' || key === 'j' || key === 'c' || key === 'u'))
    ) {
      e.preventDefault();
      showSecurityToast('🔒 Chế độ kiểm tra mã nguồn (Inspect DevTools) đã bị khóa.');
      return false;
    }
  }, { capture: true });

  // 3. Disable Dragging of Images, Videos, and Audio files
  document.addEventListener('dragstart', (e) => {
    if (e.target && (e.target.tagName === 'IMG' || e.target.tagName === 'VIDEO' || e.target.tagName === 'AUDIO' || e.target.tagName === 'A')) {
      e.preventDefault();
      return false;
    }
  }, { capture: true });

  // 4. Disable Selection on mouse events outside form fields
  document.addEventListener('selectstart', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable)) {
      return true;
    }
    e.preventDefault();
    return false;
  }, { capture: true });

  // Security Notice Toast Utility
  let toastTimeout = null;
  function showSecurityToast(message) {
    let toast = document.querySelector('#uniflows-security-toast');
    if (!toast) {
      toast = document.createElement('div');
      toast.id = 'uniflows-security-toast';
      toast.style.cssText = `
        position: fixed;
        bottom: 24px;
        left: 50%;
        transform: translateX(-50%) translateY(100px);
        background: #0f172a;
        color: #f8fafc;
        border: 1px solid #3b82f6;
        border-radius: 8px;
        padding: 12px 20px;
        font-family: 'DM Mono', monospace, sans-serif;
        font-size: 12px;
        font-weight: 700;
        letter-spacing: 0.2px;
        box-shadow: 0 10px 25px rgba(0,0,0,0.5);
        z-index: 999999;
        pointer-events: none;
        opacity: 0;
        transition: transform 0.25s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.25s ease;
        max-width: 90vw;
        text-align: center;
      `;
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.style.opacity = '1';
    toast.style.transform = 'translateX(-50%) translateY(0)';

    if (toastTimeout) clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateX(-50%) translateY(100px)';
    }, 2800);
  }
})();
