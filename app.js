/*
 * Sơ đồ lớp — ứng dụng tĩnh, không cần backend.
 * Dữ liệu khởi tạo được lấy từ ./lastest.json khi chạy trên GitHub Pages.
 */
(() => {
  'use strict';

  const STORAGE_KEY = 'so-do-lop-github-v2';
  const MAX_HISTORY = 40;
  const DEFAULT_DATA = {
    title: '10A8',
    rows: 6,
    cols: 9,
    aisleCols: [4],
    seats: [
      'Dương Hiếu Phong', '', 'Nguyễn Như Ngọc', 'Đỗ Hà Phương', '', 'Hồ Hiếu Phong', '', 'Hoàng Đặng Phương Nguyễn', 'Ngô Tiến Thịnh',
      'Hoàng Đàm Khánh Linh', 'Tạ Khánh Linh', 'Nguyễn Thanh Tâm', 'Hoàng Phương Linh', '', 'Nguyễn Hữu Khánh Huy', 'Nguyễn Diệp Phương', '', 'Đặng Đình Thái',
      'Nguyễn Quang Tùng', 'Trần Thị Như Ngọc', '', 'Nguyễn Minh Quân', '', 'Bùi Tú Phương', 'Nguyễn Thị Khánh Linh', 'Lê Ngọc Diệp', 'Bùi Mậu Toàn',
      'Nguyễn Văn Hải', 'Nguyễn Quang Phước', 'Hoàng Phạm Diệu Hương', 'Nguyễn Thị Trà My', '', 'Trần Thị Huyền Ngọc', '', 'Đàm Tiến Thanh', 'Nguyễn Thanh Phong',
      'Nguyễn Lê Minh Đức', 'Bùi Minh Quân', '', 'Nguyễn Phương Thảo', '', 'Đặng Trần Lộc', 'Trần Đức Minh', 'Vũ Anh Thư', 'Nguyễn Thị Khánh Ly',
      '', 'Nguyễn Vũ Bình Minh', 'Nguyễn Hoàng Tùng', 'Trần Văn Tùng', '', 'Hoàng Anh Thư', 'Nguyễn Yến Vy', 'Chu Công Lộc', ''
    ]
  };

  const $ = (selector) => document.querySelector(selector);
  const els = {
    className: $('#className'), rowsInput: $('#rowsInput'), colsInput: $('#colsInput'), aisleInput: $('#aisleInput'),
    studentCount: $('#studentCount'), emptyCount: $('#emptyCount'), occupancyCount: $('#occupancyCount'), layoutDescription: $('#layoutDescription'),
    workspaceTitle: $('#workspaceTitle'), diagramTitle: $('#diagramTitle'), diagramStudents: $('#diagramStudents'), diagramDate: $('#diagramDate'), schoolYear: $('#schoolYear'),
    grid: $('#seatGrid'), gridViewport: $('#gridViewport'), diagramPrint: $('#diagramPrint'),
    rosterList: $('#rosterList'), rosterCount: $('#rosterCount'), rosterEmpty: $('#rosterEmpty'), searchInput: $('#searchInput'), clearSearchBtn: $('#clearSearchBtn'),
    saveStatus: $('#saveStatus'), zoomRange: $('#zoomRange'), selectionBar: $('#selectionBar'), selectionText: $('#selectionText'),
    previewPopup: $('#previewPopup'), previewPopupExportBtn: $('#previewPopupExportBtn'), previewPopupCloseBtn: $('#previewPopupCloseBtn'), officialWatermark: $('#officialWatermark'),
    themeToggle: $('#themeToggle'), themeToggleIcon: $('#themeToggleIcon'), themeMenu: $('#themeMenu'),
    undoBtn: $('#undoBtn'), redoBtn: $('#redoBtn'), jsonFile: $('#jsonFile'), toast: $('#toast'),
    editModal: $('#editModal'), editForm: $('#editForm'), editName: $('#editName'), editPosition: $('#editPosition'), deleteSeatBtn: $('#deleteSeatBtn'),
    confirmModal: $('#confirmModal'), confirmTitle: $('#confirmTitle'), confirmMessage: $('#confirmMessage'), confirmAcceptBtn: $('#confirmAcceptBtn'), confirmCancelBtn: $('#confirmCancelBtn'),
    loadErrorModal: $('#loadErrorModal'), closeLoadErrorBtn: $('#closeLoadErrorBtn'), createNewFromErrorBtn: $('#createNewFromErrorBtn'),
    workspace: $('.workspace-area')
  };

  let data = normaliseData(DEFAULT_DATA);
  let ui = { zoom: 92, theme: 'light', selected: null, search: '' };
  let previewChanged = false;
  let sourceFingerprint = null;
  let undoStack = [];
  let redoStack = [];
  let draggedIndex = null;
  let editingIndex = null;
  let titleBeforeEdit = data.title;
  let toastTimer = null;
  let previewPopupTimer = null;
  let confirmResolver = null;
  let suppressSeatClick = false;

  function clamp(value, min, max) { return Math.min(max, Math.max(min, value)); }
  function clone(value) { return JSON.parse(JSON.stringify(value)); }
  function cleanName(value) { return String(value ?? '').replace(/\s+/g, ' ').trim(); }
  function safeTitle(value) { return cleanName(value).slice(0, 50) || 'Lớp mới'; }

  function normaliseData(payload) {
    const raw = payload && typeof payload === 'object' ? payload : {};
    const rows = clamp(Number.parseInt(raw.rows, 10) || 6, 1, 20);
    const cols = clamp(Number.parseInt(raw.cols, 10) || 9, 1, 20);
    const total = rows * cols;
    let aisleCols;
    if (Array.isArray(raw.aisleCols)) {
      aisleCols = raw.aisleCols.map(Number).filter((n) => Number.isInteger(n) && n >= 0 && n < cols);
    } else {
      aisleCols = cols >= 3 && cols % 2 === 1 ? [Math.floor(cols / 2)] : [];
    }
    aisleCols = [...new Set(aisleCols)].sort((a, b) => a - b);
    const seats = Array.isArray(raw.seats) ? raw.seats.slice(0, total).map(cleanName) : [];
    while (seats.length < total) seats.push('');
    aisleCols.forEach((col) => {
      for (let row = 0; row < rows; row += 1) seats[row * cols + col] = '';
    });
    return { title: safeTitle(raw.title || '10A8'), rows, cols, aisleCols, seats };
  }

  function createEmptyLayout() {
    return { title: 'Lớp mới', rows: 6, cols: 9, aisleCols: [4], seats: Array(54).fill('') };
  }

  function fingerprint(value) {
    const string = JSON.stringify(normaliseData(value));
    let hash = 2166136261;
    for (let i = 0; i < string.length; i += 1) {
      hash ^= string.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return `${hash >>> 0}:${string.length}`;
  }

  function isAisle(index, subject = data) { return subject.aisleCols.includes(index % subject.cols); }
  function usableIndexes(subject = data) {
    return Array.from({ length: subject.rows * subject.cols }, (_, index) => index).filter((index) => !isAisle(index, subject));
  }
  function studentIndexes(subject = data) { return usableIndexes(subject).filter((index) => Boolean(cleanName(subject.seats[index]))); }
  function getPosition(index, subject = data) {
    const row = Math.floor(index / subject.cols) + 1;
    const column = (index % subject.cols) + 1;
    return `H${row} · C${column}`;
  }
  function displaySeatNumber(index) { return String(index + 1).padStart(2, '0'); }

  function setSaveStatus(text, state = 'ok') {
    els.saveStatus.textContent = text;
    const dot = $('.status-dot');
    if (dot) dot.style.background = state === 'error' ? '#e14d5a' : state === 'loading' ? '#f0a343' : '#17a875';
  }

  function showToast(message) {
    els.toast.textContent = message;
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2600);
  }

  function showPreviewPopup() {
    els.previewPopup.hidden = false;
    els.previewPopup.classList.add('show');
    clearTimeout(previewPopupTimer);
    previewPopupTimer = setTimeout(() => {
      els.previewPopup.classList.remove('show');
      setTimeout(() => { if (!els.previewPopup.classList.contains('show')) els.previewPopup.hidden = true; }, 180);
    }, 8500);
  }

  function hidePreviewPopup() {
    clearTimeout(previewPopupTimer);
    els.previewPopup.classList.remove('show');
    setTimeout(() => { els.previewPopup.hidden = true; }, 180);
  }

  function markPreviewChanged() {
    previewChanged = true;
    els.officialWatermark.hidden = false;
    showPreviewPopup();
    setSaveStatus('Bản xem trước chưa xuất', 'loading');
  }

  function restoreSaveStatus() {
    setSaveStatus(previewChanged ? 'Bản xem trước chưa xuất' : 'Đã lưu tự động', previewChanged ? 'loading' : 'ok');
  }

  function applyTheme(theme, save = false) {
    ui.theme = theme === 'dark' ? 'dark' : 'light';
    document.documentElement.dataset.theme = ui.theme;
    document.querySelector('meta[name="theme-color"]')?.setAttribute('content', ui.theme === 'dark' ? '#101728' : '#315efb');
    els.themeToggleIcon.innerHTML = ui.theme === 'dark'
      ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>'
      : '<path d="M21 12.8A8.5 8.5 0 1 1 11.2 3 6.7 6.7 0 0 0 21 12.8Z"/>';
    els.themeToggle.title = ui.theme === 'dark' ? 'Giao diện tối' : 'Giao diện sáng';
    els.themeToggle.setAttribute('aria-label', els.themeToggle.title);
    document.querySelectorAll('[data-theme-choice]').forEach((button) => {
      const active = button.dataset.themeChoice === ui.theme;
      button.classList.toggle('active', active);
      button.setAttribute('aria-checked', String(active));
    });
    if (save) saveLocal();
  }

  function closeThemeMenu() {
    els.themeMenu.hidden = true;
    els.themeToggle.setAttribute('aria-expanded', 'false');
  }

  function saveLocal() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        version: 2, savedAt: Date.now(), sourceFingerprint, previewChanged, data, ui: { zoom: ui.zoom, theme: ui.theme }
      }));
      if (!previewChanged) setSaveStatus('Đã lưu tự động');
    } catch (error) {
      setSaveStatus('Không thể lưu cục bộ', 'error');
    }
  }

  function readLocal() {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && saved.data && Array.isArray(saved.data.seats) ? saved : null;
    } catch (error) {
      return null;
    }
  }

  function updateHistoryButtons() {
    els.undoBtn.disabled = undoStack.length === 0;
    els.redoBtn.disabled = redoStack.length === 0;
  }

  // Kích thước được tính bằng JavaScript để các ô tự đổi tỉ lệ khi xoay/đổi màn hình.
  // Ở điện thoại, giới hạn tối thiểu giữ tên học sinh còn đọc được và cho phép cuộn ngang.
  function applyZoomStyles() {
    const compact = window.matchMedia('(max-width: 560px)').matches;
    const seatMin = compact ? Math.max(58, Math.round(ui.zoom * 0.72)) : ui.zoom;
    const seatHeight = compact
      ? Math.max(70, Math.min(105, Math.round(ui.zoom * 0.78)))
      : Math.max(84, Math.min(128, Math.round(ui.zoom * 0.96)));
    const seatFont = compact
      ? Math.max(9, Math.min(13, Math.round(ui.zoom * 0.12)))
      : Math.max(9, Math.min(14, Math.round(ui.zoom * 0.132)));
    const root = document.documentElement.style;
    root.setProperty('--seat-size', `${ui.zoom}px`);
    root.setProperty('--seat-height', `${seatHeight}px`);
    root.setProperty('--seat-font', `${seatFont}px`);
    els.grid.style.setProperty('--seat-min', `${seatMin}px`);
    els.grid.style.minWidth = `${data.cols * seatMin}px`;
  }

  function pushHistory() {
    undoStack.push(JSON.stringify(data));
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    updateHistoryButtons();
  }

  function transact(message, mutate) {
    const before = JSON.stringify(data);
    mutate();
    data = normaliseData(data);
    if (JSON.stringify(data) === before) return false;
    undoStack.push(before);
    if (undoStack.length > MAX_HISTORY) undoStack.shift();
    redoStack = [];
    ui.selected = null;
    render();
    markPreviewChanged();
    saveLocal();
    updateHistoryButtons();
    if (message) showToast(message);
    return true;
  }

  function undo() {
    if (!undoStack.length) return;
    redoStack.push(JSON.stringify(data));
    data = normaliseData(JSON.parse(undoStack.pop()));
    ui.selected = null;
    render();
    markPreviewChanged();
    saveLocal();
    updateHistoryButtons();
    showToast('Đã hoàn tác thao tác gần nhất.');
  }

  function redo() {
    if (!redoStack.length) return;
    undoStack.push(JSON.stringify(data));
    data = normaliseData(JSON.parse(redoStack.pop()));
    ui.selected = null;
    render();
    markPreviewChanged();
    saveLocal();
    updateHistoryButtons();
    showToast('Đã làm lại thao tác.');
  }

  function updateTextOnly() {
    const count = studentIndexes().length;
    const capacity = usableIndexes().length;
    const empty = capacity - count;
    const occupancy = capacity ? Math.round((count / capacity) * 100) : 0;
    const aisleWord = data.aisleCols.length === 1 ? 'lối đi' : 'lối đi';

    els.studentCount.textContent = count;
    els.emptyCount.textContent = empty;
    els.occupancyCount.textContent = `${occupancy}%`;
    els.layoutDescription.textContent = `${data.rows} hàng · ${data.cols - data.aisleCols.length} dãy bàn · ${data.aisleCols.length} ${aisleWord}`;
    els.workspaceTitle.textContent = `Lớp ${data.title}`;
    els.diagramTitle.textContent = `SƠ ĐỒ LỚP ${data.title}`;
    els.diagramStudents.textContent = `${count} học sinh`;
    document.title = `Sơ đồ lớp · ${data.title}`;

    const date = new Date();
    els.diagramDate.textContent = `Cập nhật ${date.toLocaleDateString('vi-VN')}`;
    const year = date.getMonth() >= 7 ? date.getFullYear() : date.getFullYear() - 1;
    els.schoolYear.textContent = `${year} — ${year + 1}`;
  }

  function renderGrid() {
    els.grid.style.setProperty('--grid-cols', data.cols);
    els.grid.innerHTML = '';
    const fragment = document.createDocumentFragment();

    for (let index = 0; index < data.rows * data.cols; index += 1) {
      if (isAisle(index)) {
        const aisle = document.createElement('div');
        aisle.className = 'aisle';
        aisle.setAttribute('aria-label', `Lối đi cột ${index % data.cols + 1}`);
        fragment.appendChild(aisle);
        continue;
      }

      const name = cleanName(data.seats[index]);
      const seat = document.createElement('div');
      seat.className = `seat${name ? '' : ' empty'}${ui.selected === index ? ' selected' : ''}`;
      seat.dataset.index = String(index);
      seat.draggable = true;
      seat.tabIndex = 0;
      seat.setAttribute('role', 'button');
      seat.setAttribute('aria-label', name ? `Chỗ ${displaySeatNumber(index)}, ${name}` : `Chỗ ${displaySeatNumber(index)} đang trống`);
      seat.title = name ? `${name} — ${getPosition(index)}\nNhấp đúp để sửa` : `Chỗ trống — ${getPosition(index)}\nNhấp đúp để thêm tên`;

      const number = document.createElement('span');
      number.className = 'seat-number';
      number.textContent = displaySeatNumber(index);
      seat.appendChild(number);

      const content = document.createElement('span');
      content.className = 'seat-name';
      content.textContent = name || 'TRỐNG';
      seat.appendChild(content);

      const edit = document.createElement('button');
      edit.className = 'seat-edit';
      edit.type = 'button';
      edit.setAttribute('aria-label', `Sửa chỗ ${displaySeatNumber(index)}`);
      edit.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z"/></svg>';
      edit.addEventListener('click', (event) => { event.stopPropagation(); openEdit(index); });
      seat.appendChild(edit);

      seat.addEventListener('click', () => {
        if (suppressSeatClick) return;
        handleSeatSelection(index);
      });
      seat.addEventListener('dblclick', () => openEdit(index));
      seat.addEventListener('keydown', (event) => {
        if (event.key === 'Enter') { event.preventDefault(); openEdit(index); }
        if (event.key === ' ') { event.preventDefault(); handleSeatSelection(index); }
      });
      seat.addEventListener('dragstart', (event) => {
        draggedIndex = index;
        seat.classList.add('dragging');
        event.dataTransfer.effectAllowed = 'move';
        event.dataTransfer.setData('text/plain', String(index));
      });
      seat.addEventListener('dragend', () => {
        draggedIndex = null;
        suppressSeatClick = true;
        setTimeout(() => { suppressSeatClick = false; }, 50);
        document.querySelectorAll('.seat').forEach((item) => item.classList.remove('dragging', 'over'));
      });
      seat.addEventListener('dragover', (event) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
        if (draggedIndex !== null && draggedIndex !== index) seat.classList.add('over');
      });
      seat.addEventListener('dragleave', () => seat.classList.remove('over'));
      seat.addEventListener('drop', (event) => {
        event.preventDefault();
        const from = draggedIndex;
        if (from === null || from === index || isAisle(from) || isAisle(index)) return;
        transact('Đã đổi chỗ ngồi.', () => {
          [data.seats[from], data.seats[index]] = [data.seats[index], data.seats[from]];
        });
      });
      fragment.appendChild(seat);
    }
    els.grid.appendChild(fragment);
  }

  function renderRoster() {
    const query = ui.search.trim().toLocaleLowerCase('vi');
    const students = studentIndexes().map((index) => ({ index, name: data.seats[index] }));
    const filtered = query ? students.filter((student) => student.name.toLocaleLowerCase('vi').includes(query)) : students;
    els.rosterCount.textContent = students.length;
    els.rosterList.innerHTML = '';
    els.rosterEmpty.hidden = filtered.length !== 0;
    els.clearSearchBtn.hidden = !ui.search;

    const fragment = document.createDocumentFragment();
    filtered.forEach(({ index, name }) => {
      const item = document.createElement('button');
      item.type = 'button';
      item.className = 'roster-item';
      item.innerHTML = `<span class="roster-seat">${displaySeatNumber(index)}</span><span style="min-width:0"><span class="roster-name"></span><span class="roster-position">${getPosition(index)}</span></span>`;
      item.querySelector('.roster-name').textContent = name;
      item.addEventListener('click', () => {
        ui.selected = index;
        renderGrid();
        renderSelection();
        const seat = els.grid.querySelector(`[data-index="${index}"]`);
        seat?.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
      });
      fragment.appendChild(item);
    });
    els.rosterList.appendChild(fragment);
  }

  function renderSelection() {
    if (ui.selected === null || isAisle(ui.selected)) {
      els.selectionBar.hidden = true;
      return;
    }
    const name = cleanName(data.seats[ui.selected]);
    els.selectionText.textContent = name ? `Đã chọn: ${name}. Chọn chỗ đích để đổi.` : `Đã chọn chỗ trống. Chọn chỗ có học sinh để chuyển.`;
    els.selectionBar.hidden = false;
  }

  function render() {
    applyZoomStyles();
    els.className.value = data.title;
    els.rowsInput.value = data.rows;
    els.colsInput.value = data.cols;
    els.aisleInput.value = data.aisleCols.map((column) => column + 1).join(', ');
    els.zoomRange.value = ui.zoom;
    els.officialWatermark.hidden = !previewChanged;
    updateTextOnly();
    renderGrid();
    renderRoster();
    renderSelection();
    updateHistoryButtons();
  }

  function handleSeatSelection(index) {
    if (ui.selected === null) {
      ui.selected = index;
      renderGrid();
      renderSelection();
      return;
    }
    if (ui.selected === index) {
      ui.selected = null;
      renderGrid();
      renderSelection();
      return;
    }
    const from = ui.selected;
    transact('Đã chuyển chỗ ngồi.', () => {
      [data.seats[from], data.seats[index]] = [data.seats[index], data.seats[from]];
    });
  }

  function openEdit(index) {
    if (index === null || isAisle(index)) return;
    editingIndex = index;
    ui.selected = null;
    renderGrid();
    renderSelection();
    els.editPosition.textContent = `CHỖ ${displaySeatNumber(index)} · ${getPosition(index)}`;
    els.editName.value = data.seats[index] || '';
    els.deleteSeatBtn.disabled = !cleanName(data.seats[index]);
    els.editModal.hidden = false;
    setTimeout(() => { els.editName.focus(); els.editName.select(); }, 40);
  }

  function closeEdit() {
    els.editModal.hidden = true;
    editingIndex = null;
  }

  function saveEdit() {
    if (editingIndex === null) return;
    const index = editingIndex;
    const value = cleanName(els.editName.value);
    closeEdit();
    transact(value ? 'Đã cập nhật chỗ ngồi.' : 'Đã để trống chỗ ngồi.', () => { data.seats[index] = value; });
  }

  function addStudent() {
    const index = usableIndexes().find((seatIndex) => !cleanName(data.seats[seatIndex]));
    if (index === undefined) { showToast('Lớp đã hết chỗ trống.'); return; }
    openEdit(index);
  }

  function randomiseSeats() {
    const indexes = usableIndexes();
    const students = indexes.map((index) => cleanName(data.seats[index])).filter(Boolean);
    if (students.length < 2) { showToast('Cần ít nhất 2 học sinh để xáo trộn.'); return; }
    for (let i = students.length - 1; i > 0; i -= 1) {
      const randomIndex = Math.floor(Math.random() * (i + 1));
      [students[i], students[randomIndex]] = [students[randomIndex], students[i]];
    }
    transact('Đã xáo trộn chỗ ngồi. Bạn có thể hoàn tác nếu cần.', () => {
      indexes.forEach((index, position) => { data.seats[index] = students[position] || ''; });
    });
  }

  function parseAisles(input, cols) {
    const numbers = String(input || '').match(/\d+/g) || [];
    return [...new Set(numbers.map(Number).filter((number) => number >= 1 && number <= cols).map((number) => number - 1))].sort((a, b) => a - b);
  }

  async function applyLayout() {
    const rows = clamp(Number.parseInt(els.rowsInput.value, 10) || data.rows, 1, 20);
    const cols = clamp(Number.parseInt(els.colsInput.value, 10) || data.cols, 1, 20);
    const aisleCols = parseAisles(els.aisleInput.value, cols);
    const oldStudents = studentIndexes().map((index) => data.seats[index]);
    const capacity = rows * (cols - aisleCols.length);
    const lost = Math.max(0, oldStudents.length - capacity);
    const structureChanged = rows !== data.rows || cols !== data.cols || JSON.stringify(aisleCols) !== JSON.stringify(data.aisleCols);
    if (!structureChanged) { showToast('Bố cục chưa thay đổi.'); return; }

    const message = lost
      ? `Bố cục mới chỉ có ${capacity} chỗ. ${lost} học sinh cuối danh sách sẽ không còn chỗ ngồi. Bạn vẫn có thể hoàn tác.`
      : `Chuyển sang sơ đồ ${rows} hàng × ${cols} cột. Tên học sinh được tự xếp lại theo thứ tự hiện tại.`;
    if (!(await askConfirm('Áp dụng bố cục mới?', message, 'Áp dụng'))) return;

    transact('Đã áp dụng bố cục phòng học mới.', () => {
      const next = { title: data.title, rows, cols, aisleCols, seats: Array(rows * cols).fill('') };
      usableIndexes(next).forEach((index, position) => { next.seats[index] = oldStudents[position] || ''; });
      data = next;
    });
  }

  function clearAll() {
    askConfirm('Xóa toàn bộ tên?', 'Tất cả tên học sinh sẽ được xóa, nhưng bố cục bàn ghế vẫn được giữ lại. Bạn có thể hoàn tác thao tác này.', 'Xóa toàn bộ').then((accepted) => {
      if (!accepted) return;
      transact('Đã xóa tất cả tên học sinh.', () => {
        usableIndexes().forEach((index) => { data.seats[index] = ''; });
      });
    });
  }

  function askConfirm(title, message, acceptText = 'Xác nhận') {
    els.confirmTitle.textContent = title;
    els.confirmMessage.textContent = message;
    els.confirmAcceptBtn.textContent = acceptText;
    els.confirmModal.hidden = false;
    setTimeout(() => els.confirmAcceptBtn.focus(), 20);
    return new Promise((resolve) => { confirmResolver = resolve; });
  }

  function settleConfirm(value) {
    if (els.confirmModal.hidden) return;
    els.confirmModal.hidden = true;
    const resolver = confirmResolver;
    confirmResolver = null;
    resolver?.(value);
  }

  function showLoadError() {
    els.loadErrorModal.hidden = false;
    setTimeout(() => els.createNewFromErrorBtn.focus(), 20);
  }

  function closeLoadError() {
    els.loadErrorModal.hidden = true;
  }

  function createNewFromMissingFile() {
    data = normaliseData(createEmptyLayout());
    sourceFingerprint = null;
    ui.selected = null;
    undoStack = [];
    redoStack = [];
    closeLoadError();
    render();
    markPreviewChanged();
    saveLocal();
    showToast('Đã tạo sơ đồ trống. Hãy thiết lập bố cục và thêm học sinh.');
    document.querySelector('.sidebar')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function downloadBlob(blob, filename) { 
    const anchor = document.createElement('a');
    anchor.href = URL.createObjectURL(blob);
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(anchor.href), 1200);
  }

  function filename(extension) {
    const clean = data.title.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '_').replace(/^_+|_+$/g, '') || 'lop';
    return `so-do-lop-${clean}.${extension}`;
  }

  function exportJSON() {
    const output = { ...clone(data), format: 'classroom-layout', exportedAt: new Date().toISOString() };
    downloadBlob(new Blob([JSON.stringify(output, null, 2)], { type: 'application/json;charset=utf-8' }), filename('json'));
    showToast('Đã xuất JSON. Hãy cập nhật file lastest.json lên dự án.');
  }

  function csvValue(value) {
    const text = String(value ?? '');
    return /[",\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  }

  function exportCSV() {
    const rows = [['So cho', 'Hang', 'Cot', 'Vi tri', 'Hoc sinh']];
    usableIndexes().forEach((index) => rows.push([
      index + 1, Math.floor(index / data.cols) + 1, (index % data.cols) + 1, getPosition(index), data.seats[index] || ''
    ]));
    const content = `\uFEFF${rows.map((row) => row.map(csvValue).join(',')).join('\n')}`;
    downloadBlob(new Blob([content], { type: 'text/csv;charset=utf-8' }), filename('csv'));
    showToast('Đã xuất danh sách CSV.');
  }

  async function importFile(file) {
    if (!file) return;
    try {
      const payload = JSON.parse(await file.text());
      if (!payload || !Array.isArray(payload.seats)) throw new Error('invalid');
      pushHistory();
      data = normaliseData(payload);
      sourceFingerprint = null;
      ui.selected = null;
      render();
      markPreviewChanged();
      saveLocal();
      showToast(`Đã tải sơ đồ “${data.title}”.`);
    } catch (error) {
      showToast('Không thể đọc file JSON này. Hãy kiểm tra lại định dạng.');
    } finally {
      els.jsonFile.value = '';
    }
  }

  function waitForScript(src, test) {
    if (test()) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const oldScript = [...document.scripts].find((script) => script.src === src);
      const script = oldScript || Object.assign(document.createElement('script'), { src, async: true });
      const timeout = setTimeout(() => reject(new Error('timeout')), 9000);
      script.addEventListener('load', () => { clearTimeout(timeout); resolve(); }, { once: true });
      script.addEventListener('error', () => { clearTimeout(timeout); reject(new Error('network')); }, { once: true });
      if (!oldScript) document.head.appendChild(script);
    });
  }

  async function ensureExportLibraries(pdf = false) {
    await waitForScript('https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js', () => Boolean(window.html2canvas));
    if (pdf) await waitForScript('https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js', () => Boolean(window.jspdf?.jsPDF));
  }

  async function createCanvas() {
    await ensureExportLibraries(false);
    const hidden = [...els.diagramPrint.querySelectorAll('.seat-number, .seat-edit')];
    const oldDisplay = hidden.map((element) => element.style.display);
    const previousOverflow = els.gridViewport.style.overflow;
    hidden.forEach((element) => { element.style.display = 'none'; });
    els.gridViewport.style.overflow = 'visible';
    if (previewChanged) document.body.classList.add('exporting-preview');
    try {
      const canvas = await window.html2canvas(els.diagramPrint, {
        scale: 2,
        backgroundColor: '#ffffff',
        useCORS: true,
        width: els.diagramPrint.scrollWidth,
        height: els.diagramPrint.scrollHeight
      });
      return canvas;
    } finally {
      hidden.forEach((element, index) => { element.style.display = oldDisplay[index]; });
      els.gridViewport.style.overflow = previousOverflow;
      document.body.classList.remove('exporting-preview');
    }
  }

  async function exportPNG() {
    try {
      setSaveStatus('Đang tạo ảnh…', 'loading');
      const canvas = await createCanvas();
      canvas.toBlob((blob) => {
        if (blob) downloadBlob(blob, filename('png'));
        restoreSaveStatus();
        showToast('Đã xuất ảnh PNG chất lượng cao.');
      }, 'image/png');
    } catch (error) {
      restoreSaveStatus();
      showToast('Không thể xuất ảnh. Hãy kiểm tra kết nối Internet rồi thử lại.');
    }
  }

  async function exportPDF() {
    try {
      setSaveStatus('Đang tạo PDF…', 'loading');
      await ensureExportLibraries(true);
      const canvas = await createCanvas();
      const { jsPDF } = window.jspdf;
      const pdf = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4', compress: true });
      const pageW = 297; const pageH = 210; const margin = 7;
      const maxW = pageW - margin * 2; const maxH = pageH - margin * 2;
      let width = maxW; let height = (width * canvas.height) / canvas.width;
      if (height > maxH) { height = maxH; width = (height * canvas.width) / canvas.height; }
      pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (pageW - width) / 2, (pageH - height) / 2, width, height, undefined, 'FAST');
      pdf.save(filename('pdf'));
      restoreSaveStatus();
      showToast('Đã xuất PDF khổ A4 ngang.');
    } catch (error) {
      restoreSaveStatus();
      showToast('Không thể xuất PDF. Hãy kiểm tra kết nối Internet rồi thử lại.');
    }
  }

  async function fetchSeed() {
    const response = await fetch('./lastest.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    if (!payload || !Array.isArray(payload.seats)) throw new Error('Invalid format');
    return normaliseData(payload);
  }

  async function reloadSeed(ask = true) {
    if (ask && !(await askConfirm('Khôi phục bản mẫu?', 'Sơ đồ hiện tại sẽ được thay bằng dữ liệu trong file lastest.json. Bản hiện tại vẫn có thể hoàn tác trong phiên này.', 'Tải bản mẫu'))) return;
    try {
      setSaveStatus('Đang đọc lastest.json…', 'loading');
      const seed = await fetchSeed();
      pushHistory();
      data = seed;
      sourceFingerprint = fingerprint(seed);
      previewChanged = false;
      hidePreviewPopup();
      ui.selected = null;
      render();
      saveLocal();
      showToast('Đã tải dữ liệu từ lastest.json.');
    } catch (error) {
      setSaveStatus('Không tải được sơ đồ', 'error');
      showLoadError();
    }
  }

  function toggleFullscreen() {
    const full = els.workspace.classList.toggle('fullscreen-board');
    const button = $('#fullscreenBtn');
    button.title = full ? 'Thoát toàn màn hình' : 'Toàn màn hình';
    button.setAttribute('aria-label', button.title);
    if (full) els.workspace.scrollIntoView({ block: 'start' });
  }

  function bindEvents() {
    els.themeToggle.addEventListener('click', (event) => {
      event.stopPropagation();
      const open = els.themeMenu.hidden;
      els.themeMenu.hidden = !open;
      els.themeToggle.setAttribute('aria-expanded', String(open));
    });
    els.themeMenu.addEventListener('click', (event) => {
      const choice = event.target.closest('[data-theme-choice]');
      if (!choice) return;
      applyTheme(choice.dataset.themeChoice, true);
      closeThemeMenu();
    });
    document.addEventListener('click', (event) => {
      if (!event.target.closest('.theme-picker')) closeThemeMenu();
    });
    els.previewPopupExportBtn.addEventListener('click', exportJSON);
    els.previewPopupCloseBtn.addEventListener('click', hidePreviewPopup);
    els.closeLoadErrorBtn.addEventListener('click', closeLoadError);
    els.createNewFromErrorBtn.addEventListener('click', createNewFromMissingFile);
    els.loadErrorModal.addEventListener('click', (event) => { if (event.target === els.loadErrorModal) closeLoadError(); });

    $('#addStudentTopBtn').addEventListener('click', addStudent);
    $('#addStudentRosterBtn').addEventListener('click', addStudent);
    $('#shuffleBtn').addEventListener('click', randomiseSeats);
    $('#clearBtn').addEventListener('click', clearAll);
    $('#resetBtn').addEventListener('click', () => reloadSeed(true));
    $('#loadSeedBtn').addEventListener('click', () => reloadSeed(true));
    $('#applyLayoutBtn').addEventListener('click', applyLayout);
    $('#importBtn').addEventListener('click', () => els.jsonFile.click());
    $('#exportJsonBtn').addEventListener('click', exportJSON);
    $('#exportCsvBtn').addEventListener('click', exportCSV);
    $('#exportPngBtn').addEventListener('click', exportPNG);
    $('#exportPdfBtn').addEventListener('click', exportPDF);
    $('#printBtn').addEventListener('click', () => window.print());
    els.jsonFile.addEventListener('change', (event) => importFile(event.target.files[0]));
    els.undoBtn.addEventListener('click', undo);
    els.redoBtn.addEventListener('click', redo);
    $('#fullscreenBtn').addEventListener('click', toggleFullscreen);
    $('#cancelSelectionBtn').addEventListener('click', () => { ui.selected = null; renderGrid(); renderSelection(); });

    els.className.addEventListener('focus', () => { titleBeforeEdit = data.title; });
    els.className.addEventListener('input', () => {
      data.title = safeTitle(els.className.value);
      els.workspaceTitle.textContent = `Lớp ${data.title}`;
      els.diagramTitle.textContent = `SƠ ĐỒ LỚP ${data.title}`;
      document.title = `Sơ đồ lớp · ${data.title}`;
    });
    els.className.addEventListener('change', () => {
      if (data.title !== titleBeforeEdit) {
        undoStack.push(JSON.stringify({ ...data, title: titleBeforeEdit }));
        if (undoStack.length > MAX_HISTORY) undoStack.shift();
        redoStack = [];
        updateHistoryButtons();
        markPreviewChanged();
        saveLocal();
        showToast('Đã đổi tên lớp.');
      }
      els.className.value = data.title;
    });
    $('#editClassBtn').addEventListener('click', () => { els.className.focus(); els.className.select(); });

    els.searchInput.addEventListener('input', () => { ui.search = els.searchInput.value; renderRoster(); });
    els.clearSearchBtn.addEventListener('click', () => { ui.search = ''; els.searchInput.value = ''; renderRoster(); els.searchInput.focus(); });
    els.zoomRange.addEventListener('input', () => {
      ui.zoom = Number(els.zoomRange.value);
      applyZoomStyles();
      saveLocal();
    });
    window.addEventListener('resize', applyZoomStyles, { passive: true });

    els.editForm.addEventListener('submit', (event) => { event.preventDefault(); saveEdit(); });
    $('#closeEditBtn').addEventListener('click', closeEdit);
    $('#cancelEditBtn').addEventListener('click', closeEdit);
    els.deleteSeatBtn.addEventListener('click', () => {
      if (editingIndex === null) return;
      els.editName.value = '';
      saveEdit();
    });
    els.editModal.addEventListener('click', (event) => { if (event.target === els.editModal) closeEdit(); });

    els.confirmAcceptBtn.addEventListener('click', () => settleConfirm(true));
    els.confirmCancelBtn.addEventListener('click', () => settleConfirm(false));
    els.confirmModal.addEventListener('click', (event) => { if (event.target === els.confirmModal) settleConfirm(false); });

    $('#mobileAddBtn').addEventListener('click', addStudent);
    $('#mobileShuffleBtn').addEventListener('click', randomiseSeats);
    $('#mobileExportBtn').addEventListener('click', exportJSON);
    $('#mobileMoreBtn').addEventListener('click', () => document.querySelector('.sidebar').scrollIntoView({ behavior: 'smooth', block: 'start' }));

    window.addEventListener('keydown', (event) => {
      const meta = event.ctrlKey || event.metaKey;
      if (meta && event.key.toLowerCase() === 'z') { event.preventDefault(); event.shiftKey ? redo() : undo(); }
      if (meta && event.key.toLowerCase() === 'y') { event.preventDefault(); redo(); }
      if (event.key === 'Escape') {
        if (!els.editModal.hidden) closeEdit();
        else if (!els.confirmModal.hidden) settleConfirm(false);
        else if (!els.loadErrorModal.hidden) closeLoadError();
        else if (!els.themeMenu.hidden) closeThemeMenu();
        else if (els.workspace.classList.contains('fullscreen-board')) toggleFullscreen();
        else if (ui.selected !== null) { ui.selected = null; renderGrid(); renderSelection(); }
      }
    });
  }

  async function bootstrap() {
    bindEvents();
    setSaveStatus('Đang đọc lastest.json…', 'loading');
    const local = readLocal();
    let initialLoadFailed = false;
    if (local?.ui?.theme === 'dark') ui.theme = 'dark';
    try {
      const seed = await fetchSeed();
      const remoteFingerprint = fingerprint(seed);
      if (local && (!local.sourceFingerprint || local.sourceFingerprint === remoteFingerprint)) {
        data = normaliseData(local.data);
        ui.zoom = clamp(Number(local.ui?.zoom) || 92, 64, 132);
        ui.theme = local.ui?.theme === 'dark' ? 'dark' : 'light';
        previewChanged = Boolean(local.previewChanged);
        sourceFingerprint = local.sourceFingerprint || null;
        setSaveStatus('Đã khôi phục bản đang làm');
      } else {
        data = seed;
        sourceFingerprint = remoteFingerprint;
        previewChanged = false;
        setSaveStatus('Đã tải lastest.json');
      }
    } catch (error) {
      initialLoadFailed = true;
      if (local) {
        data = normaliseData(local.data);
        ui.zoom = clamp(Number(local.ui?.zoom) || 92, 64, 132);
        ui.theme = local.ui?.theme === 'dark' ? 'dark' : 'light';
        previewChanged = Boolean(local.previewChanged);
        sourceFingerprint = local.sourceFingerprint || null;
        setSaveStatus('Đang dùng bản lưu cục bộ', 'loading');
      } else {
        data = normaliseData(createEmptyLayout());
        previewChanged = false;
        setSaveStatus('Không tải được sơ đồ', 'error');
      }
    }
    applyTheme(ui.theme);
    render();
    if (previewChanged) markPreviewChanged();
    saveLocal();
    if (initialLoadFailed) showLoadError();
  }

  bootstrap();
})();
