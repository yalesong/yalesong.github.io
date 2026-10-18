const newsData = [
  { date: "2025-07-01", text: "Starting a new chapter at Google" },
  { date: "2024-06-01", text: "Invited talk at Large-Scale Holistic Video Understanding at CVPR 2024", url: "https://holistic-video-understanding.github.io/workshops/cvpr2024.html" },
  { date: "2024-06-01", text: "Invited talk at Synthetic Data for Computer Vision at CVPR 2024", url: "https://syndata4cv.github.io/cvpr2024.html" },
  { date: "2022-06-01", text: "Invited talk at Large-Scale Holistic Video Understanding at CVPR 2022", url: "https://holistic-video-understanding.github.io/workshops/cvpr2022.html" },
  { date: "2022-06-01", text: "Panel at T4V: Transformers for Vision at CVPR 2022", url: "https://sites.google.com/view/t4v-cvpr22" },
  { date: "2022-04-01", text: "Starting a new chapter at Meta AI!" },
  { date: "2022-03-01", text: "Invited talk at Stanford Computer Vision and Learning Lab", url: "http://svl.stanford.edu/" },
  { date: "2022-02-01", text: "Panel at UofT AI Conference", url: "https://www.uoft.ai/conference-2022" },
  { date: "2022-01-01", text: "Featured on deeplearning.ai where I talk about foundation vision models", url: "https://read.deeplearning.ai/the-batch/issue-125/" },
  { date: "2021-12-01", text: "Invited talk at New in ML Workshop at NeurIPS 2021", url: "https://sunhaozhe.github.io/NewInML2021_NeurIPS/" },
  { date: "2021-10-01", text: "Invited talk at Large-Scale Holistic Video Understanding at ICCV 2021", links: [{label: "Video", url: "https://youtu.be/KwVdGALzJo8?t=10974"}, {label: "Slides", url: "http://people.csail.mit.edu/yalesong/files/iccv2021-hvu-release.pdf"}] },
  { date: "2021-10-01", text: "Co-organizing a tutorial on Efficient Video Understanding at ICCV 2021", links: [{label: "Video", url: "https://drive.google.com/file/d/1waqF_GrnXUmRkrmxgrG0J5dP4rj7XAGJ/view"}, {label: "Slides", url: "http://people.csail.mit.edu/yalesong/files/iccv2021-eff-release.pdf"}] },
  { date: "2021-09-01", text: "ACAV100M: A new dataset of 100 million clips (31 years in total) for video self-supervised learning", url: "https://acav100m.github.io/" },
  { date: "2021-06-01", text: "Serving as Area Chair for ICLR 2021" },
  { date: "2020-02-01", text: "Serving as Expo Chair and Area Chair for NeurIPS 2020" },
  { date: "2019-12-01", text: "Co-organizing a workshop on Learning from Unlabeled Videos at CVPR 2020" },
  { date: "2019-09-01", text: "One paper on characterizing bias in visual classifiers accepted at NeurIPS 2019", url: "https://arxiv.org/abs/1906.11891" }
];

function renderNews(filterYears) {
  const newsList = document.getElementById('news-list');
  if (!newsList) return;
  newsList.innerHTML = '';
  
  const now = new Date();
  const filteredNews = newsData.filter(item => {
    if (filterYears === 'all') return true;
    const itemDate = new Date(item.date);
    const diffTime = Math.abs(now - itemDate);
    const diffYears = diffTime / (1000 * 60 * 60 * 24 * 365.25);
    return diffYears <= filterYears;
  });

  filteredNews.sort((a, b) => new Date(b.date) - new Date(a.date));

  filteredNews.forEach(item => {
    const li = document.createElement('li');
    li.className = 'news-item';
    
    const dateSpan = document.createElement('span');
    dateSpan.className = 'news-date';
    const d = new Date(item.date);
    dateSpan.textContent = d.toLocaleDateString('en-US', { year: 'numeric', month: 'short' });
    
    const contentSpan = document.createElement('span');
    contentSpan.className = 'news-content';
    
    let html = item.text;
    if (item.url) {
      html = `<a href="${item.url}" target="_blank">${item.text}</a>`;
    }
    
    if (item.links) {
      html += ' [' + item.links.map(l => `<a href="${l.url}" target="_blank">${l.label}</a>`).join(' / ') + ']';
    }
    
    contentSpan.innerHTML = html;
    
    li.appendChild(dateSpan);
    li.appendChild(contentSpan);
    newsList.appendChild(li);
  });
}

document.querySelectorAll('.filter-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
    e.target.classList.add('active');
    const years = e.target.dataset.years;
    renderNews(years === 'all' ? 'all' : parseInt(years));
  });
});

let rawPubs = [];
let allPubs = [];

// Metadata is loaded from pub_metadata.js (window.PUB_METADATA)
const pubMetadata = window.PUB_METADATA || {};
let isAdminMode = false;
let activeEditKey = null;
let pendingMergeSourceKey = null;

function mergeTwoEntries(sourceKey, targetKey) {
  if (!sourceKey || !targetKey || sourceKey === targetKey) return;
  pubMetadata[sourceKey] = {
    ...(pubMetadata[sourceKey] || {}),
    merged_into: targetKey
  };
  // If any entries were previously merged into sourceKey, re-point them to targetKey
  Object.keys(pubMetadata).forEach(k => {
    if (pubMetadata[k] && pubMetadata[k].merged_into === sourceKey) {
      pubMetadata[k].merged_into = targetKey;
    }
  });
  pendingMergeSourceKey = null;
  applyMetadataAndSort();
  renderFilteredPubs();
  setAdminStatus(`Merged ${sourceKey} → ${targetKey} (click Push to GitHub or Save Local File to persist)`);
}

function unmergeEntry(sourceKey) {
  if (!sourceKey || !pubMetadata[sourceKey]) return;
  delete pubMetadata[sourceKey].merged_into;
  if (Object.keys(pubMetadata[sourceKey]).length === 0) {
    delete pubMetadata[sourceKey];
  }
  applyMetadataAndSort();
  renderFilteredPubs();
  setAdminStatus(`Unmerged ${sourceKey} (click Push to GitHub or Save Local File to persist)`);
}

function applyMetadataAndSort() {
  const venueFilter = document.getElementById('venue-filter');
  const prevVenueVal = venueFilter ? venueFilter.value : 'all';

  // 1. Clone raw publications
  const cloned = rawPubs.map(r => ({
    info: { ...r.info, venue: r.info.rawVenue, year: r.info.rawYear },
    authors: [...r.authors],
    altKey: null,
    mergedKeys: [],
    mergedEntries: [],
    meta: { ...(pubMetadata[r.info.key] || {}) }
  }));

  // 2. Automatic exact-title deduplication (keep venue version over CoRR)
  const seenTitles = new Map();
  cloned.forEach(pub => {
    // If an entry is explicitly merged_into another, keep it separate for step 3
    if (pubMetadata[pub.info.key]?.merged_into) {
      seenTitles.set(`__manual_${pub.info.key}`, pub);
      return;
    }
    const normTitle = pub.info.title.toLowerCase().replace(/[^a-z0-9]/g, '');
    const existing = seenTitles.get(normTitle);
    if (!existing) {
      seenTitles.set(normTitle, pub);
    } else {
      const isExistingCoRR = existing.info.rawVenue === 'CoRR';
      const isNewCoRR = pub.info.rawVenue === 'CoRR';
      if (isExistingCoRR && !isNewCoRR) {
        pub.altKey = existing.info.key;
        pub.meta = { ...existing.meta, ...pub.meta };
        pub.mergedEntries.push({
          key: existing.info.key,
          title: existing.info.title,
          authors: existing.authors,
          venue: existing.info.rawVenue,
          year: existing.info.rawYear,
          mode: 'auto by title'
        });
        seenTitles.set(normTitle, pub);
      } else if (!isExistingCoRR && isNewCoRR) {
        existing.altKey = pub.info.key;
        existing.meta = { ...pub.meta, ...existing.meta };
        existing.mergedEntries.push({
          key: pub.info.key,
          title: pub.info.title,
          authors: pub.authors,
          venue: pub.info.rawVenue,
          year: pub.info.rawYear,
          mode: 'auto by title'
        });
      }
    }
  });

  const deduped = Array.from(seenTitles.values());

  // 3. Apply manual merges (merged_into in pubMetadata)
  const byKey = new Map();
  deduped.forEach(pub => {
    byKey.set(pub.info.key, pub);
    if (pub.altKey) byKey.set(pub.altKey, pub);
  });

  const absorbedKeys = new Set();
  deduped.forEach(pub => {
    const targetKey = pubMetadata[pub.info.key]?.merged_into;
    if (!targetKey) return;
    const targetPub = byKey.get(targetKey);
    if (targetPub && targetPub !== pub) {
      const sourceMetaClean = { ...(pub.meta || {}) };
      delete sourceMetaClean.merged_into;
      targetPub.meta = { ...sourceMetaClean, ...(targetPub.meta || {}) };
      if (!targetPub.mergedKeys.includes(pub.info.key)) {
        targetPub.mergedKeys.push(pub.info.key);
        targetPub.mergedEntries.push({
          key: pub.info.key,
          title: pub.info.title,
          authors: pub.authors,
          venue: pub.info.rawVenue,
          year: pub.info.rawYear,
          mode: 'manual merge'
        });
      }
      absorbedKeys.add(pub.info.key);
    }
  });

  allPubs = deduped.filter(pub => !absorbedKeys.has(pub.info.key));

  // 4. Apply venue_full / venue / year overrides
  allPubs.forEach(pub => {
    const baseMeta = pub.altKey ? { ...(pubMetadata[pub.altKey] || {}) } : {};
    const mergedMeta = {};
    (pub.mergedKeys || []).forEach(mk => {
      const m = { ...(pubMetadata[mk] || {}) };
      delete m.merged_into;
      Object.assign(mergedMeta, m);
    });
    pub.meta = { ...baseMeta, ...mergedMeta, ...(pubMetadata[pub.info.key] || {}) };
    pub.info.venue = pub.info.rawVenue;
    pub.info.year = pub.info.rawYear;

    const meta = pub.meta;
    if (meta.venue_full) {
      const match = meta.venue_full.match(/^(.*?)\s+(\d{4})$/);
      if (match) {
        pub.info.venue = match[1];
        pub.info.year = match[2];
      } else {
        pub.info.venue = meta.venue_full;
      }
    }
    if (meta.venue) pub.info.venue = meta.venue;
    if (meta.year) pub.info.year = String(meta.year);
  });

  // Sort by Year DESC, then ArXiv Month DESC
  allPubs.sort((a, b) => {
    const yearA = parseInt(a.info.year);
    const yearB = parseInt(b.info.year);
    if (yearB !== yearA) return yearB - yearA;

    const getSortScore = (hit) => {
      const info = hit.info;
      if (info.venue === 'CoRR' && info.volume && info.volume.startsWith('abs/')) {
        const match = info.volume.match(/abs\/(\d{2})(\d{2})/);
        if (match) return parseInt(match[1]) * 100 + parseInt(match[2]);
      }
      return 0;
    };
    return getSortScore(b) - getSortScore(a);
  });

  // Populate Venues and counts
  const venueCounts = {};
  allPubs.forEach(pub => {
    const v = pub.info.venue;
    if (v) venueCounts[v] = (venueCounts[v] || 0) + 1;
  });

  const venues = Object.keys(venueCounts);
  const sortedVenues = venues.sort((a, b) => {
    const priority = ['CVPR', 'NeurIPS', 'ICLR', 'ICML', 'ICCV', 'ECCV', 'CoRR'];
    const indexA = priority.indexOf(a);
    const indexB = priority.indexOf(b);
    if (indexA !== -1 && indexB !== -1) return indexA - indexB;
    if (indexA !== -1) return -1;
    if (indexB !== -1) return 1;
    return a.localeCompare(b);
  });

  if (venueFilter) {
    venueFilter.innerHTML = '<option value="all">All Venues</option>';
    sortedVenues.forEach(v => {
      const opt = document.createElement('option');
      opt.value = v;
      const displayName = v === 'CoRR' ? 'ArXiv / Preprints' : v;
      const truncatedName = displayName.length > 20 ? displayName.substring(0, 17) + '...' : displayName;
      opt.textContent = `${truncatedName} (${venueCounts[v]})`;
      venueFilter.appendChild(opt);
    });
    if (prevVenueVal === 'all' || venueCounts[prevVenueVal]) {
      venueFilter.value = prevVenueVal;
    }
  }
}

async function fetchPublications() {
  const pubList = document.getElementById('pub-list');
  const venueFilter = document.getElementById('venue-filter');
  
  try {
    const DBLP_URL = 'https://dblp.org/pid/31/9606.xml';
    const FALLBACK_URL = './dblp_fallback.xml';
    
    let xmlText;
    try {
      // Load the repo-cached XML first (instant same-origin load; avoids DBLP Anubis CORS blocks)
      const response = await fetch(FALLBACK_URL);
      if (!response.ok) throw new Error('Fallback returned status ' + response.status);
      const text = await response.text();
      if (!text.includes('<dblpperson')) throw new Error('Invalid fallback XML');
      xmlText = text;
    } catch (fallbackErr) {
      // When opening index.html directly via file://, browsers block fetch() on local files.
      // Fall back to loading dblp_fallback.js via a <script> tag, or live DBLP URL.
      try {
        xmlText = await new Promise((resolve, reject) => {
          if (window.DBLP_FALLBACK_XML) return resolve(window.DBLP_FALLBACK_XML);
          const s = document.createElement('script');
          s.src = './dblp_fallback.js';
          s.onload = () => window.DBLP_FALLBACK_XML ? resolve(window.DBLP_FALLBACK_XML) : reject(fallbackErr);
          s.onerror = () => reject(fallbackErr);
          document.head.appendChild(s);
        });
      } catch (scriptErr) {
        const response = await fetch(DBLP_URL);
        if (!response.ok) throw new Error('DBLP returned status ' + response.status);
        xmlText = await response.text();
      }
    }

    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlText, "text/xml");
    
    const records = Array.from(xmlDoc.querySelectorAll('r > *')).filter(
      record => record.tagName.toLowerCase() !== 'proceedings'
    );
    
    rawPubs = records.map(record => {
        const info = {};
        info.rawYear = record.querySelector('year')?.textContent || "0";
        info.year = info.rawYear;
        info.title = record.querySelector('title')?.textContent || "";
        info.ee = record.querySelector('ee')?.textContent || "";
        info.key = record.getAttribute('key');
        info.url = `https://dblp.org/rec/${info.key}`;
        
        info.rawVenue = record.querySelector('journal')?.textContent || 
                        record.querySelector('booktitle')?.textContent || 
                        record.querySelector('school')?.textContent || "Unknown";
        info.venue = info.rawVenue;
        
        if (info.rawVenue === 'CoRR') {
            info.volume = record.querySelector('volume')?.textContent || "";
        }

        const authors = Array.from(record.querySelectorAll('author')).map(a => a.textContent.replace(/\s\d+$/, ''));
        return { info, authors };
    });

    if (rawPubs.length === 0) {
        pubList.innerHTML = '<li>No publications found.</li>';
        return;
    }

    applyMetadataAndSort();
    renderFilteredPubs();
    
    document.getElementById('time-filter').addEventListener('change', renderFilteredPubs);
    venueFilter.addEventListener('change', (e) => {
        if (e.target.value !== 'all') document.getElementById('time-filter').value = 'all';
        renderFilteredPubs();
    });

  } catch (error) {
    console.error('Error fetching publications:', error);
    if (pubList) pubList.innerHTML = '<li class="error">Failed to load publications from DBLP.</li>';
  }
}

function renderFilteredPubs() {
  const pubList = document.getElementById('pub-list');
  const pubCountSpan = document.getElementById('pub-count');
  const timeVal = document.getElementById('time-filter').value;
  const venueVal = document.getElementById('venue-filter').value;
  const now = new Date();

  let filtered = allPubs;

  if (venueVal !== 'all') {
    filtered = filtered.filter(h => h.info.venue === venueVal);
  }

  if (timeVal === '10') {
    filtered = filtered.slice(0, 10);
  } else if (timeVal !== 'all') {
    if (timeVal === '2026') {
        filtered = filtered.filter(h => h.info.year === '2026');
    } else {
        const years = parseInt(timeVal);
        filtered = filtered.filter(h => (now.getFullYear() - parseInt(h.info.year)) < years);
    }
  }

  if (pubCountSpan) pubCountSpan.textContent = `(${filtered.length})`;

  if (!pubList) return;
  pubList.innerHTML = '';
  if (filtered.length === 0) {
      pubList.innerHTML = '<li>No publications match your criteria.</li>';
      return;
  }

  filtered.forEach(pub => {
    const info = pub.info;
    const li = document.createElement('li');
    li.className = 'pub-item';

    const metaPatch = pub.meta || pubMetadata[info.key] || {};

    const titleText = info.title.endsWith('.') ? info.title.slice(0, -1) : info.title;
    const authorList = pub.authors.join(', ');
    const paperLink = info.ee || info.url;
    const venueName = info.venue;

    // Build extra info (awards and links)
    let extraInfoHtml = '';
    if (metaPatch.awards && metaPatch.awards.length > 0) {
        extraInfoHtml += `<span class="pub-awards">${metaPatch.awards.join(' | ')}</span> `;
    }
    
    const extraLinks = [];
    if (metaPatch.project) extraLinks.push(`<a href="${metaPatch.project}" target="_blank">Project</a>`);
    if (metaPatch.code) extraLinks.push(`<a href="${metaPatch.code}" target="_blank">Code</a>`);
    if (metaPatch.data) extraLinks.push(`<a href="${metaPatch.data}" target="_blank">Data</a>`);
    if (metaPatch.video) extraLinks.push(`<a href="${metaPatch.video}" target="_blank">Video</a>`);
    if (metaPatch.blog) extraLinks.push(`<a href="${metaPatch.blog}" target="_blank">Blog</a>`);
    if (metaPatch.press) extraLinks.push(`<a href="${metaPatch.press}" target="_blank">Press</a>`);
    if (metaPatch.poster) extraLinks.push(`<a href="${metaPatch.poster}" target="_blank">Poster</a>`);
    if (metaPatch.slides) extraLinks.push(`<a href="${metaPatch.slides}" target="_blank">Slides</a>`);
    if (metaPatch.demo) extraLinks.push(`<a href="${metaPatch.demo}" target="_blank">Demo</a>`);

    if (extraLinks.length > 0) {
        extraInfoHtml += `<span class="pub-links">${extraLinks.map(link => `[${link}]`).join('')}</span>`;
    }

    let adminControlsHtml = '';
    if (isAdminMode) {
      const mergedEntries = pub.mergedEntries || [];
      let mergedBadge = '';
      if (mergedEntries.length > 0) {
        const tooltipItemsHtml = mergedEntries.map(me => {
          const cleanTitle = me.title.endsWith('.') ? me.title.slice(0, -1) : me.title;
          return `
            <div class="pub-merged-tooltip-item">
              <span class="pub-merged-tooltip-title">${cleanTitle}</span>
              <span class="pub-merged-tooltip-authors">${(me.authors || []).join(', ')}</span>
              <span class="pub-merged-tooltip-meta">${me.venue} ${me.year} &middot; <code>${me.key}</code> (${me.mode})</span>
            </div>
          `;
        }).join('');
        mergedBadge = `<span class="pub-merged-badge">+${mergedEntries.length} merged<div class="pub-merged-tooltip">${tooltipItemsHtml}</div></span>`;
      }

      let mergeBtnHtml = '';
      if (!pendingMergeSourceKey) {
        mergeBtnHtml = `<button type="button" class="pub-edit-btn pub-merge-btn" data-key="${info.key}" title="Select this duplicate entry to merge into another entry">Merge...</button>`;
      } else if (pendingMergeSourceKey === info.key) {
        mergeBtnHtml = `<button type="button" class="pub-edit-btn pub-merge-btn pub-merge-source-btn" data-key="${info.key}">Cancel Merge</button>`;
      } else {
        mergeBtnHtml = `<button type="button" class="pub-edit-btn pub-merge-btn pub-merge-target-btn" data-key="${info.key}">Merge Into This</button>`;
      }

      adminControlsHtml = `<span class="pub-key-badge">${info.key}</span>${mergedBadge}<button type="button" class="pub-edit-btn pub-open-edit-btn" data-key="${info.key}">Edit</button>${mergeBtnHtml}`;
    }

    li.innerHTML = `
        ${paperLink ? `<a href="${paperLink}" target="_blank" style="text-decoration:none; color:inherit;">` : ''}
            <span class="pub-title">${titleText}</span>
        ${paperLink ? `</a>` : ''}
        <span class="pub-authors">${authorList}</span>
        <div class="pub-meta">
            <span class="pub-venue">${venueName}</span>
            <span class="pub-year">${info.year}</span>
            ${extraInfoHtml ? `<span class="pub-extra">${extraInfoHtml}</span>` : ''}
            ${adminControlsHtml}
        </div>
    `;

    if (isAdminMode) {
      const editBtn = li.querySelector('.pub-open-edit-btn');
      if (editBtn) {
        editBtn.addEventListener('click', () => {
          activeEditKey = activeEditKey === info.key ? null : info.key;
          renderFilteredPubs();
        });
      }

      const mergeBtn = li.querySelector('.pub-merge-btn');
      if (mergeBtn) {
        mergeBtn.addEventListener('click', () => {
          if (!pendingMergeSourceKey) {
            pendingMergeSourceKey = info.key;
            setAdminStatus(`Select target paper to absorb "${info.key}"`);
            renderFilteredPubs();
          } else if (pendingMergeSourceKey === info.key) {
            pendingMergeSourceKey = null;
            setAdminStatus('');
            renderFilteredPubs();
          } else {
            mergeTwoEntries(pendingMergeSourceKey, info.key);
          }
        });
      }

      if (activeEditKey === info.key) {
        li.appendChild(createInlineEditorForm(pub));
      }
    }

    pubList.appendChild(li);
  });
}

function createInlineEditorForm(pub) {
  const info = pub.info;
  const meta = pub.meta || pubMetadata[info.key] || {};
  const formDiv = document.createElement('div');
  formDiv.className = 'pub-edit-form';

  const fields = [
    { key: 'venue_full', label: 'Venue Override (e.g. ICML 2026, CVPR 2026)', placeholder: `${info.rawVenue} ${info.rawYear}`, value: meta.venue_full || '' },
    { key: 'awards', label: 'Awards (comma-separated, e.g. Spotlight, Oral)', placeholder: 'Spotlight, Oral, Highlight', value: (meta.awards || []).join(', ') },
    { key: 'project', label: 'Project URL', placeholder: 'https://...', value: meta.project || '' },
    { key: 'code', label: 'Code URL', placeholder: 'https://github.com/...', value: meta.code || '' },
    { key: 'data', label: 'Data URL', placeholder: 'https://...', value: meta.data || '' },
    { key: 'slides', label: 'Slides URL', placeholder: 'https://...', value: meta.slides || '' },
    { key: 'poster', label: 'Poster URL', placeholder: 'https://...', value: meta.poster || '' },
    { key: 'video', label: 'Video URL', placeholder: 'https://...', value: meta.video || '' },
    { key: 'blog', label: 'Blog URL', placeholder: 'https://...', value: meta.blog || '' },
    { key: 'press', label: 'Press URL', placeholder: 'https://...', value: meta.press || '' },
    { key: 'demo', label: 'Demo URL', placeholder: 'https://...', value: meta.demo || '' }
  ];

  const grid = document.createElement('div');
  grid.className = 'pub-edit-grid';

  fields.forEach(f => {
    const wrap = document.createElement('div');
    wrap.className = 'pub-edit-field';
    const label = document.createElement('label');
    label.textContent = f.label;
    const input = document.createElement('input');
    input.type = 'text';
    input.name = f.key;
    input.placeholder = f.placeholder;
    input.value = f.value;
    wrap.appendChild(label);
    wrap.appendChild(input);
    grid.appendChild(wrap);
  });

  // Add "Absorb Duplicate Entry into This Paper" selector
  const mergeWrap = document.createElement('div');
  mergeWrap.className = 'pub-edit-field';
  const mergeLabel = document.createElement('label');
  mergeLabel.textContent = 'Absorb Duplicate Entry into This Paper';
  const mergeSelect = document.createElement('select');
  mergeSelect.name = 'absorb_duplicate_key';
  const defaultOpt = document.createElement('option');
  defaultOpt.value = '';
  defaultOpt.textContent = '— Select a duplicate entry to merge into this one —';
  mergeSelect.appendChild(defaultOpt);

  const candidates = allPubs
    .filter(p => p.info.key !== info.key)
    .sort((a, b) => {
      const distA = Math.abs(parseInt(a.info.year) - parseInt(info.year));
      const distB = Math.abs(parseInt(b.info.year) - parseInt(info.year));
      if (distA !== distB) return distA - distB;
      return parseInt(b.info.year) - parseInt(a.info.year);
    });

  candidates.forEach(c => {
    const opt = document.createElement('option');
    opt.value = c.info.key;
    const shortTitle = c.info.title.length > 55 ? c.info.title.slice(0, 52) + '...' : c.info.title;
    opt.textContent = `[${c.info.venue} ${c.info.year}] ${shortTitle} (${c.info.key})`;
    mergeSelect.appendChild(opt);
  });

  mergeWrap.appendChild(mergeLabel);
  mergeWrap.appendChild(mergeSelect);
  grid.appendChild(mergeWrap);

  formDiv.appendChild(grid);

  // Show currently merged entries (with Unmerge button for manual merges)
  if ((pub.mergedKeys && pub.mergedKeys.length > 0) || pub.altKey) {
    const mergedListDiv = document.createElement('div');
    mergedListDiv.className = 'pub-merged-list';
    const titleSpan = document.createElement('span');
    titleSpan.textContent = 'Merged duplicates:';
    mergedListDiv.appendChild(titleSpan);

    if (pub.altKey) {
      const chip = document.createElement('span');
      chip.className = 'pub-unmerge-chip';
      chip.textContent = `${pub.altKey} (auto by title)`;
      mergedListDiv.appendChild(chip);
    }

    (pub.mergedKeys || []).forEach(mk => {
      const chip = document.createElement('span');
      chip.className = 'pub-unmerge-chip';
      const txt = document.createElement('span');
      txt.textContent = mk;
      const unmergeBtn = document.createElement('button');
      unmergeBtn.type = 'button';
      unmergeBtn.title = `Unmerge ${mk}`;
      unmergeBtn.textContent = '×';
      unmergeBtn.addEventListener('click', () => {
        unmergeEntry(mk);
      });
      chip.appendChild(txt);
      chip.appendChild(unmergeBtn);
      mergedListDiv.appendChild(chip);
    });

    formDiv.appendChild(mergedListDiv);
  }

  const actions = document.createElement('div');
  actions.className = 'pub-edit-actions';

  const collectFormEntry = () => {
    const entry = {};
    fields.forEach(f => {
      const val = formDiv.querySelector(`input[name="${f.key}"]`).value.trim();
      if (!val) return;
      if (f.key === 'awards') {
        const arr = val.split(/[,|]/).map(s => s.trim()).filter(Boolean);
        if (arr.length > 0) entry.awards = arr;
      } else {
        entry[f.key] = val;
      }
    });
    if (Object.keys(entry).length > 0) {
      pubMetadata[info.key] = entry;
    } else {
      delete pubMetadata[info.key];
    }
    if (pub.altKey && pubMetadata[pub.altKey] && !pubMetadata[pub.altKey].merged_into) {
      delete pubMetadata[pub.altKey];
    }

    const absorbKey = mergeSelect.value;
    if (absorbKey) {
      pubMetadata[absorbKey] = {
        ...(pubMetadata[absorbKey] || {}),
        merged_into: info.key
      };
    }

    activeEditKey = null;
    applyMetadataAndSort();
    renderFilteredPubs();
  };

  const pushBtn = document.createElement('button');
  pushBtn.type = 'button';
  pushBtn.className = 'admin-btn admin-btn-primary';
  pushBtn.textContent = 'Save & Push to GitHub';
  pushBtn.addEventListener('click', async () => {
    collectFormEntry();
    await saveMetadataToGitHub();
  });

  const localBtn = document.createElement('button');
  localBtn.type = 'button';
  localBtn.className = 'admin-btn';
  localBtn.textContent = 'Save to Local File';
  localBtn.addEventListener('click', async () => {
    collectFormEntry();
    await saveMetadataToLocalFile();
  });

  const applyBtn = document.createElement('button');
  applyBtn.type = 'button';
  applyBtn.className = 'admin-btn';
  applyBtn.textContent = 'Apply (Preview)';
  applyBtn.addEventListener('click', () => {
    collectFormEntry();
    setAdminStatus('Applied in memory (click Push to GitHub or Save Local File to persist)');
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'admin-btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', () => {
    activeEditKey = null;
    renderFilteredPubs();
  });

  actions.appendChild(pushBtn);
  actions.appendChild(localBtn);
  actions.appendChild(applyBtn);
  actions.appendChild(cancelBtn);
  formDiv.appendChild(actions);

  return formDiv;
}

function serializePubMetadataFile() {
  return (
    '// Metadata for specific publications (Awards, Special Links, Venue Overrides, etc.)\n' +
    '// Use the DBLP record key as the unique identifier.\n' +
    '// Supported fields: venue_full (e.g. "ICML 2026"), awards (array), project, code, data, video, blog, press, poster, slides, demo\n' +
    'window.PUB_METADATA = ' +
    JSON.stringify(pubMetadata, null, 2) +
    ';\n\n' +
    '// Editable site content (Bio, Openings, Professional Service)\n' +
    'window.SITE_CONTENT = ' +
    JSON.stringify(siteContent, null, 2) +
    ';\n'
  );
}

const siteContent = window.SITE_CONTENT || {
  bioHtml: '',
  openingsVisible: true,
  openings: [],
  service: []
};
let activeSectionEditor = null; // 'bio' | 'openings' | 'service' | null

function buildSectionActionsBar(collectFn, onCancel) {
  const actions = document.createElement('div');
  actions.className = 'pub-edit-actions';

  const pushBtn = document.createElement('button');
  pushBtn.type = 'button';
  pushBtn.className = 'admin-btn admin-btn-primary';
  pushBtn.textContent = 'Save & Push to GitHub';
  pushBtn.addEventListener('click', async () => {
    collectFn();
    await saveMetadataToGitHub();
  });

  const localBtn = document.createElement('button');
  localBtn.type = 'button';
  localBtn.className = 'admin-btn';
  localBtn.textContent = 'Save to Local File';
  localBtn.addEventListener('click', async () => {
    collectFn();
    await saveMetadataToLocalFile();
  });

  const applyBtn = document.createElement('button');
  applyBtn.type = 'button';
  applyBtn.className = 'admin-btn';
  applyBtn.textContent = 'Apply (Preview)';
  applyBtn.addEventListener('click', () => {
    collectFn();
    setAdminStatus('Applied in memory (click Push to GitHub or Save Local File to persist)');
  });

  const cancelBtn = document.createElement('button');
  cancelBtn.type = 'button';
  cancelBtn.className = 'admin-btn';
  cancelBtn.textContent = 'Cancel';
  cancelBtn.addEventListener('click', onCancel);

  actions.appendChild(pushBtn);
  actions.appendChild(localBtn);
  actions.appendChild(applyBtn);
  actions.appendChild(cancelBtn);
  return actions;
}

function createListSectionEditor(itemsKey, addBtnLabel, includeVisibleToggle = false) {
  const formDiv = document.createElement('div');
  formDiv.className = 'section-edit-form';

  const hint = document.createElement('div');
  hint.className = 'section-edit-hint';
  hint.innerHTML = 'Supports inline HTML such as <code>&lt;strong&gt;...&lt;/strong&gt;</code> and <code>&lt;a href="https://..." target="_blank"&gt;...&lt;/a&gt;</code>.';
  formDiv.appendChild(hint);

  let visCheckbox = null;
  if (includeVisibleToggle) {
    const toggleWrap = document.createElement('label');
    toggleWrap.style.display = 'inline-flex';
    toggleWrap.style.alignItems = 'center';
    toggleWrap.style.gap = '6px';
    toggleWrap.style.fontSize = '0.84rem';
    toggleWrap.style.fontWeight = '600';
    toggleWrap.style.marginBottom = '12px';
    toggleWrap.style.cursor = 'pointer';
    visCheckbox = document.createElement('input');
    visCheckbox.type = 'checkbox';
    visCheckbox.checked = siteContent.openingsVisible !== false;
    toggleWrap.appendChild(visCheckbox);
    toggleWrap.appendChild(document.createTextNode('Show Openings section on public page'));
    formDiv.appendChild(toggleWrap);
  }

  const rowsContainer = document.createElement('div');
  formDiv.appendChild(rowsContainer);

  const addRow = (catVal = '', htmlVal = '') => {
    const row = document.createElement('div');
    row.className = 'section-edit-row';

    const catInput = document.createElement('input');
    catInput.type = 'text';
    catInput.placeholder = 'Category (e.g. Research Scientist:)';
    catInput.value = catVal;

    const htmlInput = document.createElement('textarea');
    htmlInput.className = 'section-edit-textarea';
    htmlInput.rows = 2;
    htmlInput.placeholder = 'Details (HTML allowed)...';
    htmlInput.value = htmlVal;

    const rmBtn = document.createElement('button');
    rmBtn.type = 'button';
    rmBtn.className = 'section-remove-row-btn';
    rmBtn.title = 'Remove item';
    rmBtn.textContent = '×';
    rmBtn.addEventListener('click', () => row.remove());

    row.appendChild(catInput);
    row.appendChild(htmlInput);
    row.appendChild(rmBtn);
    rowsContainer.appendChild(row);
  };

  (siteContent[itemsKey] || []).forEach(item => {
    addRow(item.category || '', item.html || '');
  });

  const addBtn = document.createElement('button');
  addBtn.type = 'button';
  addBtn.className = 'admin-btn';
  addBtn.style.marginTop = '4px';
  addBtn.textContent = addBtnLabel;
  addBtn.addEventListener('click', () => addRow('', ''));
  formDiv.appendChild(addBtn);

  const collect = () => {
    const newItems = [];
    rowsContainer.querySelectorAll('.section-edit-row').forEach(row => {
      const cat = row.querySelector('input').value.trim();
      const html = row.querySelector('textarea').value.trim();
      if (cat || html) {
        newItems.push({ category: cat, html });
      }
    });
    siteContent[itemsKey] = newItems;
    if (includeVisibleToggle && visCheckbox) {
      siteContent.openingsVisible = visCheckbox.checked;
    }
    activeSectionEditor = null;
    renderEditableSections();
  };

  formDiv.appendChild(
    buildSectionActionsBar(collect, () => {
      activeSectionEditor = null;
      renderEditableSections();
    })
  );

  return formDiv;
}

function renderEditableSections() {
  // 1. Top Bio Text
  const bioEl = document.querySelector('header .bio-text');
  if (bioEl) {
    if (!siteContent.bioHtml) {
      siteContent.bioHtml = bioEl.innerHTML.trim();
    }
    const existingBioForm = document.getElementById('bio-edit-form');
    if (existingBioForm) existingBioForm.remove();

    bioEl.innerHTML = siteContent.bioHtml;
    if (isAdminMode) {
      const editBioBtn = document.createElement('button');
      editBioBtn.type = 'button';
      editBioBtn.className = 'section-edit-btn';
      editBioBtn.textContent = activeSectionEditor === 'bio' ? 'Close Editor' : 'Edit Bio';
      editBioBtn.addEventListener('click', () => {
        activeSectionEditor = activeSectionEditor === 'bio' ? null : 'bio';
        renderEditableSections();
      });
      bioEl.appendChild(editBioBtn);

      if (activeSectionEditor === 'bio') {
        const formDiv = document.createElement('div');
        formDiv.id = 'bio-edit-form';
        formDiv.className = 'section-edit-form';

        const hint = document.createElement('div');
        hint.className = 'section-edit-hint';
        hint.innerHTML = 'Edit intro bio text (supports HTML like <code>&lt;strong&gt;...&lt;/strong&gt;</code> and <code>&lt;a href="..."&gt;...&lt;/a&gt;</code>):';
        formDiv.appendChild(hint);

        const ta = document.createElement('textarea');
        ta.className = 'section-edit-textarea';
        ta.rows = 4;
        ta.value = siteContent.bioHtml;
        formDiv.appendChild(ta);

        formDiv.appendChild(
          buildSectionActionsBar(
            () => {
              siteContent.bioHtml = ta.value.trim();
              activeSectionEditor = null;
              renderEditableSections();
            },
            () => {
              activeSectionEditor = null;
              renderEditableSections();
            }
          )
        );
        bioEl.insertAdjacentElement('afterend', formDiv);
      }
    }
  }

  // 2. Openings Section
  const openingsSec = document.getElementById('openings');
  if (openingsSec) {
    const h2 = openingsSec.querySelector('h2');
    const ul = openingsSec.querySelector('ul.service-list');
    const existingForm = document.getElementById('openings-edit-form');
    if (existingForm) existingForm.remove();

    const isVisible = siteContent.openingsVisible !== false && (siteContent.openings || []).length > 0;
    openingsSec.style.display = isVisible || isAdminMode ? 'block' : 'none';

    if (h2) {
      h2.innerHTML = 'Openings';
      if (isAdminMode) {
        if (!isVisible) {
          const hiddenTag = document.createElement('small');
          hiddenTag.style.fontSize = '0.8rem';
          hiddenTag.style.fontWeight = 'normal';
          hiddenTag.style.color = '#d93025';
          hiddenTag.style.marginLeft = '10px';
          hiddenTag.textContent = '(Hidden on public page)';
          h2.appendChild(hiddenTag);
        }
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'section-edit-btn';
        editBtn.textContent = activeSectionEditor === 'openings' ? 'Close Editor' : 'Edit Openings';
        editBtn.addEventListener('click', () => {
          activeSectionEditor = activeSectionEditor === 'openings' ? null : 'openings';
          renderEditableSections();
        });
        h2.appendChild(editBtn);
      }
    }

    if (ul && Array.isArray(siteContent.openings)) {
      ul.innerHTML = '';
      siteContent.openings.forEach(item => {
        const li = document.createElement('li');
        const catHtml = item.category ? `<span class="service-category">${item.category}</span> ` : '';
        li.innerHTML = `${catHtml}${item.html || ''}`;
        ul.appendChild(li);
      });
    }

    if (isAdminMode && activeSectionEditor === 'openings') {
      const formDiv = createListSectionEditor('openings', '+ Add Opening', true);
      formDiv.id = 'openings-edit-form';
      openingsSec.appendChild(formDiv);
    }
  }

  // 3. Professional Service Section
  const serviceSec = document.getElementById('service');
  if (serviceSec) {
    const h2 = serviceSec.querySelector('h2');
    const ul = serviceSec.querySelector('ul.service-list');
    const existingForm = document.getElementById('service-edit-form');
    if (existingForm) existingForm.remove();

    if (h2) {
      h2.innerHTML = 'Professional Service';
      if (isAdminMode) {
        const editBtn = document.createElement('button');
        editBtn.type = 'button';
        editBtn.className = 'section-edit-btn';
        editBtn.textContent = activeSectionEditor === 'service' ? 'Close Editor' : 'Edit Service';
        editBtn.addEventListener('click', () => {
          activeSectionEditor = activeSectionEditor === 'service' ? null : 'service';
          renderEditableSections();
        });
        h2.appendChild(editBtn);
      }
    }

    if (ul && Array.isArray(siteContent.service) && siteContent.service.length > 0) {
      ul.innerHTML = '';
      siteContent.service.forEach(item => {
        const li = document.createElement('li');
        const catHtml = item.category ? `<span class="service-category">${item.category}</span> ` : '';
        li.innerHTML = `${catHtml}${item.html || ''}`;
        ul.appendChild(li);
      });
    }

    if (isAdminMode && activeSectionEditor === 'service') {
      const formDiv = createListSectionEditor('service', '+ Add Service Item', false);
      formDiv.id = 'service-edit-form';
      serviceSec.appendChild(formDiv);
    }
  }
}

function setAdminStatus(msg, isError = false) {
  const el = document.getElementById('admin-sync-msg');
  if (!el) return;
  el.textContent = msg ? `— ${msg}` : '';
  el.style.color = isError ? '#d93025' : 'var(--secondary-text)';
}

async function verifyGitHubToken(token) {
  if (!token) return false;
  try {
    const resp = await fetch('https://api.github.com/repos/yalesong/yalesong.github.io', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    if (!resp.ok) return false;
    const data = await resp.json();
    return Boolean(data && data.permissions && data.permissions.push === true);
  } catch (err) {
    console.error('GitHub token verification error:', err);
    return false;
  }
}

async function promptAndVerifyGitHubToken(forcePrompt = false) {
  let token = localStorage.getItem('yalesong_gh_pat') || '';
  if (!token || forcePrompt) {
    const input = window.prompt(
      'Enter your GitHub Personal Access Token (scoped to yalesong/yalesong.github.io with Contents: Read & Write).\nLeave blank to clear / logout:',
      token
    );
    if (input === null) return false;
    token = input.trim();
    if (!token) {
      localStorage.removeItem('yalesong_gh_pat');
      updateTokenButtonLabel();
      return false;
    }
  }

  const valid = await verifyGitHubToken(token);
  if (!valid) {
    localStorage.removeItem('yalesong_gh_pat');
    updateTokenButtonLabel();
    window.alert('Authentication failed: A valid GitHub token with write access to yalesong/yalesong.github.io is required.');
    return false;
  }

  localStorage.setItem('yalesong_gh_pat', token);
  updateTokenButtonLabel();
  return true;
}

function updateTokenButtonLabel() {
  const btn = document.getElementById('admin-token-btn');
  if (!btn) return;
  const hasToken = Boolean(localStorage.getItem('yalesong_gh_pat'));
  btn.textContent = hasToken ? 'Token / Logout' : 'Set GitHub Token';
}

async function saveMetadataToGitHub() {
  const verified = await promptAndVerifyGitHubToken(false);
  const token = localStorage.getItem('yalesong_gh_pat') || '';
  if (!verified || !token) {
    setAdminStatus('Valid GitHub token required to push live', true);
    return;
  }

  const repo = 'yalesong/yalesong.github.io';
  const path = 'pub_metadata.js';
  const apiUrl = `https://api.github.com/repos/${repo}/contents/${path}`;

  try {
    setAdminStatus('Pushing pub_metadata.js to GitHub...');
    let sha = undefined;
    const getResp = await fetch(apiUrl, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json'
      }
    });
    if (getResp.ok) {
      const data = await getResp.json();
      sha = data.sha;
    } else if (getResp.status !== 404) {
      const errText = await getResp.text();
      throw new Error(`GitHub GET failed (${getResp.status}): ${errText}`);
    }

    const content = serializePubMetadataFile();
    const base64Content = btoa(unescape(encodeURIComponent(content)));

    const putResp = await fetch(apiUrl, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        message: 'chore: update pub_metadata.js via inline editor',
        content: base64Content,
        ...(sha ? { sha } : {})
      })
    });

    if (!putResp.ok) {
      const errText = await putResp.text();
      throw new Error(`GitHub PUT failed (${putResp.status}): ${errText}`);
    }

    setAdminStatus('Committed to GitHub! Live site updates in ~30s.');
  } catch (err) {
    console.error('Error pushing to GitHub:', err);
    setAdminStatus(err.message || 'Failed to push to GitHub', true);
  }
}

async function saveMetadataToLocalFile() {
  if (!isAdminMode) return;
  const content = serializePubMetadataFile();
  try {
    if (window.showSaveFilePicker) {
      if (!window._pubMetadataFileHandle) {
        window._pubMetadataFileHandle = await window.showSaveFilePicker({
          suggestedName: 'pub_metadata.js',
          types: [{ description: 'JavaScript File', accept: { 'text/javascript': ['.js'] } }]
        });
      }
      const writable = await window._pubMetadataFileHandle.createWritable();
      await writable.write(content);
      await writable.close();
      setAdminStatus('Saved directly to local pub_metadata.js!');
      return;
    }
    // Fallback download for browsers without File System Access API
    const blob = new Blob([content], { type: 'text/javascript;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pub_metadata.js';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    setAdminStatus('Downloaded pub_metadata.js!');
  } catch (err) {
    if (err && err.name === 'AbortError') return;
    console.error('Error saving local file:', err);
    setAdminStatus('Failed to save local file', true);
  }
}

function initAdminMode() {
  const adminToggle = document.getElementById('admin-toggle');
  const adminBar = document.getElementById('admin-bar');
  const tokenBtn = document.getElementById('admin-token-btn');
  const saveGhBtn = document.getElementById('admin-save-github-btn');
  const saveLocalBtn = document.getElementById('admin-save-local-btn');

  const syncAdminUI = () => {
    if (adminBar) adminBar.style.display = isAdminMode ? 'flex' : 'none';
    if (adminToggle) adminToggle.classList.toggle('active', isAdminMode);
    if (!isAdminMode) activeSectionEditor = null;
    updateTokenButtonLabel();
    renderEditableSections();
    renderFilteredPubs();
  };

  const tryEnterAdminMode = async () => {
    const ok = await promptAndVerifyGitHubToken(false);
    if (ok) {
      isAdminMode = true;
      syncAdminUI();
    } else {
      isAdminMode = false;
      activeEditKey = null;
      pendingMergeSourceKey = null;
      if (window.location.hash === '#admin') {
        history.replaceState(null, '', window.location.pathname + window.location.search);
      }
      syncAdminUI();
    }
  };

  if (adminToggle) {
    adminToggle.addEventListener('click', async () => {
      if (isAdminMode) {
        isAdminMode = false;
        activeEditKey = null;
        pendingMergeSourceKey = null;
        syncAdminUI();
      } else {
        await tryEnterAdminMode();
      }
    });
  }

  window.addEventListener('hashchange', async () => {
    if (window.location.hash === '#admin' && !isAdminMode) {
      await tryEnterAdminMode();
    }
  });

  if (tokenBtn) {
    tokenBtn.addEventListener('click', async () => {
      const ok = await promptAndVerifyGitHubToken(true);
      if (!ok) {
        isAdminMode = false;
        activeEditKey = null;
        pendingMergeSourceKey = null;
        syncAdminUI();
      }
    });
  }
  if (saveGhBtn) saveGhBtn.addEventListener('click', saveMetadataToGitHub);
  if (saveLocalBtn) saveLocalBtn.addEventListener('click', saveMetadataToLocalFile);

  if (window.location.hash === '#admin') {
    tryEnterAdminMode();
  }
}

// Theme Toggle Logic
function initTheme() {
  const themeToggle = document.getElementById('theme-toggle');
  const savedTheme = localStorage.getItem('theme');
  
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
  }

  themeToggle.addEventListener('click', () => {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    let targetTheme = 'light';
    
    // If currently dark (explicitly or via system preference)
    const isDark = currentTheme === 'dark' || 
                   (!currentTheme && window.matchMedia('(prefers-color-scheme: dark)').matches);
    
    if (isDark) {
      targetTheme = 'light';
    } else {
      targetTheme = 'dark';
    }
    
    document.documentElement.setAttribute('data-theme', targetTheme);
    localStorage.setItem('theme', targetTheme);
  });
}

// Yale Song Number Tool (Shortest Co-Authorship Path)
const YALE_OPENALEX_ID = 'A5100566791';
let yaleOpenAlexCache = null; // { y1ById, y1ByName, y2WorksPromise }

function normalizeAuthorName(name) {
  return (name || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

function getLocalDblpCoauthorMap() {
  const byNormName = new Map();
  allPubs.forEach(pub => {
    const cleanTitle = pub.info.title.endsWith('.') ? pub.info.title.slice(0, -1) : pub.info.title;
    const paperObj = {
      title: cleanTitle,
      year: pub.info.year,
      venue: pub.info.venue,
      url: pub.info.ee || pub.info.url
    };
    (pub.authors || []).forEach(authorName => {
      const norm = normalizeAuthorName(authorName);
      if (!norm || norm === 'yale song') return;
      if (!byNormName.has(norm)) {
        byNormName.set(norm, { name: authorName, papers: [] });
      }
      byNormName.get(norm).papers.push(paperObj);
    });
  });
  return byNormName;
}

async function ensureYaleOpenAlexData() {
  if (yaleOpenAlexCache) return yaleOpenAlexCache;

  const y1ById = new Map();
  const y1ByName = getLocalDblpCoauthorMap();

  try {
    const resp = await fetch(
      `https://api.openalex.org/works?filter=author.id:${YALE_OPENALEX_ID}&select=id,title,publication_year,doi,authorships&sort=cited_by_count:desc&per_page=200`
    );
    if (resp.ok) {
      const data = await resp.json();
      (data.results || []).forEach(w => {
        const paperObj = {
          title: w.title || 'Untitled',
          year: w.publication_year || '',
          url: w.doi || w.id || ''
        };
        (w.authorships || []).forEach(a => {
          const rawId = (a.author && a.author.id) || '';
          const aid = rawId.split('/').pop();
          const aname = (a.author && a.author.display_name) || '';
          if (!aid || aid === YALE_OPENALEX_ID) return;
          if (!y1ById.has(aid)) {
            y1ById.set(aid, { id: aid, name: aname, papers: [] });
          }
          y1ById.get(aid).papers.push(paperObj);

          const norm = normalizeAuthorName(aname);
          if (norm && norm !== 'yale song' && !y1ByName.has(norm)) {
            y1ByName.set(norm, { id: aid, name: aname, papers: [paperObj] });
          } else if (norm && y1ByName.has(norm) && !y1ByName.get(norm).id) {
            y1ByName.get(norm).id = aid;
          }
        });
      });
    }
  } catch (err) {
    console.warn('OpenAlex Yale preload warning:', err);
  }

  yaleOpenAlexCache = { y1ById, y1ByName, y2Works: null };
  return yaleOpenAlexCache;
}

async function ensureYale2HopWorks(y1ById) {
  const cache = await ensureYaleOpenAlexData();
  if (cache.y2Works) return cache.y2Works;

  const y1Keys = Array.from(y1ById.keys()).slice(0, 150);
  const chunks = [];
  for (let i = 0; i < y1Keys.length; i += 50) {
    chunks.push(y1Keys.slice(i, i + 50));
  }

  const responses = await Promise.all(
    chunks.map(c =>
      fetch(
        `https://api.openalex.org/works?filter=author.id:${c.join('|')}&select=id,title,publication_year,doi,authorships&sort=cited_by_count:desc&per_page=200`
      ).then(r => (r.ok ? r.json() : { results: [] }))
    )
  );

  cache.y2Works = responses.flatMap(r => r.results || []);
  return cache.y2Works;
}

function renderYaleNumberChain(resultEl, number, summaryHtml, nodes, edges, altProfiles = [], onSelectAlt = null) {
  resultEl.style.display = 'block';

  let chainHtml = '';
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    const isYale = i === nodes.length - 1;
    const affilHtml = n.affil ? `<span class="yn-node-affil">(${n.affil})</span>` : '';
    chainHtml += `<div class="yn-node ${isYale ? 'yn-node-yale' : ''}"><span>${n.name}</span>${affilHtml}</div>`;
    if (i < edges.length) {
      const e = edges[i];
      const paperTitleHtml = e.url
        ? `<a href="${e.url}" target="_blank" class="yn-edge-paper">${e.title}</a>`
        : `<span class="yn-edge-paper">${e.title}</span>`;
      const venueYear = [e.venue, e.year].filter(Boolean).join(' ');
      const extraCount = e.extraCount && e.extraCount > 0 ? ` <span>(+${e.extraCount} more shared paper${e.extraCount > 1 ? 's' : ''})</span>` : '';
      chainHtml += `<div class="yn-edge">Co-authored: ${paperTitleHtml}${venueYear ? ` (${venueYear})` : ''}${extraCount}</div>`;
    }
  }

  resultEl.innerHTML = `
    <div class="yn-result-header">
      <span class="yn-badge">Yale Number: ${number}</span>
      <span class="yn-summary">${summaryHtml}</span>
    </div>
    <div class="yn-chain">${chainHtml}</div>
  `;

  if (altProfiles && altProfiles.length > 0 && onSelectAlt) {
    const altDiv = document.createElement('div');
    altDiv.className = 'yn-alt-profiles';
    const label = document.createElement('span');
    label.textContent = 'Not the right person? Try another profile:';
    altDiv.appendChild(label);

    altProfiles.slice(0, 4).forEach(p => {
      const btn = document.createElement('button');
      btn.type = 'button';
      btn.className = 'yn-example-chip';
      const inst = ((p.last_known_institutions || [])[0] || {}).display_name || '';
      btn.textContent = `${p.display_name}${inst ? ` (${inst})` : ''} · ${p.works_count || 0} works`;
      btn.addEventListener('click', () => onSelectAlt(p));
      altDiv.appendChild(btn);
    });
    resultEl.appendChild(altDiv);
  }
}

const CURATED_AI_PIONEERS = {
  'john mccarthy': {
    number: 2,
    summaryHtml: 'Connected in <strong>2 steps</strong> via <strong>Randall Davis</strong>',
    nodes: [
      { name: 'John McCarthy', affil: 'Stanford / MIT' },
      { name: 'Randall Davis', affil: 'MIT' },
      { name: 'Yale Song', affil: 'Google' }
    ],
    edges: [
      {
        title: "AI's Greatest Trends and Controversies",
        venue: 'IEEE Intelligent Systems',
        year: 2000,
        url: 'https://doi.org/10.1109/5254.820322'
      },
      {
        title: 'Action Recognition by Hierarchical Sequence Summarization',
        venue: 'CVPR',
        year: 2013,
        url: 'https://doi.org/10.1109/CVPR.2013.457',
        extraCount: 8
      }
    ]
  },
  'marvin minsky': {
    number: 2,
    summaryHtml: 'Connected in <strong>2 steps</strong> via <strong>Randall Davis</strong>',
    nodes: [
      { name: 'Marvin Minsky', affil: 'MIT' },
      { name: 'Randall Davis', affil: 'MIT' },
      { name: 'Yale Song', affil: 'Google' }
    ],
    edges: [
      {
        title: 'MIT Artificial Intelligence Laboratory',
        venue: 'MIT AI Lab',
        year: 1980,
        url: 'https://openalex.org/W2293152414'
      },
      {
        title: 'Action Recognition by Hierarchical Sequence Summarization',
        venue: 'CVPR',
        year: 2013,
        url: 'https://doi.org/10.1109/CVPR.2013.457',
        extraCount: 8
      }
    ]
  },
  'geoffrey hinton': {
    number: 2,
    summaryHtml: 'Connected in <strong>2 steps</strong> via <strong>Trevor Darrell</strong>',
    nodes: [
      { name: 'Geoffrey E. Hinton', affil: 'University of Toronto' },
      { name: 'Trevor Darrell', affil: 'UC Berkeley' },
      { name: 'Yale Song', affil: 'Google' }
    ],
    edges: [
      {
        title: 'Managing Extreme AI Risks Amid Rapid Progress',
        venue: 'Science',
        year: 2024,
        url: 'https://doi.org/10.1126/science.adn0117'
      },
      {
        title: 'Visual Attention Emerges from Recurrent Sparse Reconstruction',
        venue: 'ICML',
        year: 2022,
        url: 'https://proceedings.mlr.press/v162/shi22b.html'
      }
    ]
  },
  'yann lecun': {
    number: 2,
    summaryHtml: 'Connected in <strong>2 steps</strong> via <strong>Lorenzo Torresani</strong>',
    nodes: [
      { name: 'Yann LeCun', affil: 'NYU / Meta' },
      { name: 'Lorenzo Torresani', affil: 'Meta / Dartmouth' },
      { name: 'Yale Song', affil: 'Google' }
    ],
    edges: [
      {
        title: 'A Closer Look at Spatiotemporal Convolutions for Action Recognition',
        venue: 'CVPR',
        year: 2018,
        url: 'https://doi.org/10.1109/CVPR.2018.00675'
      },
      {
        title: 'Ego-Exo4D: Understanding Skilled Human Activity from First- and Third-Person Perspectives',
        venue: 'CVPR',
        year: 2024,
        url: 'https://doi.org/10.1109/CVPR52733.2024.01822',
        extraCount: 2
      }
    ]
  },
  'yoshua bengio': {
    number: 2,
    summaryHtml: 'Connected in <strong>2 steps</strong> via <strong>R Devon Hjelm</strong>',
    nodes: [
      { name: 'Yoshua Bengio', affil: 'Mila / Université de Montréal' },
      { name: 'R Devon Hjelm', affil: 'MSR / Apple' },
      { name: 'Yale Song', affil: 'Google' }
    ],
    edges: [
      {
        title: 'Learning Deep Representations by Mutual Information Estimation and Maximization',
        venue: 'ICLR',
        year: 2019,
        url: 'https://arxiv.org/abs/1808.06670'
      },
      {
        title: 'Robust Contrastive Learning against Noisy Views',
        venue: 'CVPR',
        year: 2022,
        url: 'https://doi.org/10.1109/CVPR52688.2022.01614'
      }
    ]
  },
  'alan turing': {
    number: 5,
    summaryHtml: 'Connected in <strong>5 steps</strong> via <strong>James H. Wilkinson</strong> &rarr; <strong>Jack J. Dongarra</strong> &rarr; <strong>Joseph E. Gonzalez</strong> &rarr; <strong>Trevor Darrell</strong>',
    nodes: [
      { name: 'Alan M. Turing', affil: 'Cambridge / Manchester' },
      { name: 'James H. Wilkinson', affil: 'NPL' },
      { name: 'Jack J. Dongarra', affil: 'UT Knoxville / ORNL' },
      { name: 'Joseph E. Gonzalez', affil: 'UC Berkeley' },
      { name: 'Trevor Darrell', affil: 'UC Berkeley' },
      { name: 'Yale Song', affil: 'Google' }
    ],
    edges: [
      {
        title: 'The Turing–Wilkinson Lecture Series on the Automatic Computing Engine',
        venue: 'NPL / Oxford Univ. Press',
        year: 1946,
        url: 'https://doi.org/10.1093/oso/9780198509417.003.0004'
      },
      {
        title: 'Improving the Accuracy of Computed Eigenvalues and Eigenvectors',
        venue: 'SIAM J. Sci. Stat. Comput.',
        year: 1983,
        url: 'https://doi.org/10.1137/0904001'
      },
      {
        title: 'Standards for Graph Algorithm Primitives',
        venue: 'IEEE HPEC',
        year: 2013,
        url: 'https://doi.org/10.1109/HPEC.2013.6670338'
      },
      {
        title: 'SkipNet: Learning Dynamic Routing in Convolutional Networks',
        venue: 'ECCV',
        year: 2018,
        url: 'https://doi.org/10.1007/978-3-030-01261-8_25'
      },
      {
        title: 'Visual Attention Emerges from Recurrent Sparse Reconstruction',
        venue: 'ICML',
        year: 2022,
        url: 'https://proceedings.mlr.press/v162/shi22b.html'
      }
    ]
  }
};
CURATED_AI_PIONEERS['geoffrey e hinton'] = CURATED_AI_PIONEERS['geoffrey hinton'];
CURATED_AI_PIONEERS['alan m turing'] = CURATED_AI_PIONEERS['alan turing'];
CURATED_AI_PIONEERS['alan mathison turing'] = CURATED_AI_PIONEERS['alan turing'];

async function computeYaleNumber(queryOrAuthor) {
  const resultEl = document.getElementById('yn-result');
  if (!resultEl) return;

  resultEl.style.display = 'block';
  resultEl.innerHTML = '<span class="loading">Searching co-authorship graph...</span>';

  try {
    let targetAuthor = typeof queryOrAuthor === 'object' ? queryOrAuthor : null;
    let rawQuery = typeof queryOrAuthor === 'string' ? queryOrAuthor.trim() : (targetAuthor?.display_name || '');
    const normQuery = normalizeAuthorName(rawQuery);

    if (!rawQuery) {
      resultEl.style.display = 'none';
      return;
    }

    // Check curated AI pioneers first (instant, verified historical paths)
    if (!targetAuthor && CURATED_AI_PIONEERS[normQuery]) {
      const c = CURATED_AI_PIONEERS[normQuery];
      renderYaleNumberChain(resultEl, c.number, c.summaryHtml, c.nodes, c.edges);
      return;
    }

    const { y1ById, y1ByName } = await ensureYaleOpenAlexData();

    // Distance 0 check
    if (normQuery === 'yale song' || (targetAuthor && targetAuthor.id && targetAuthor.id.endsWith(YALE_OPENALEX_ID))) {
      renderYaleNumberChain(
        resultEl,
        0,
        "That's me! (0 degrees of separation)",
        [{ name: 'Yale Song', affil: 'Google' }],
        []
      );
      return;
    }

    // Instant Distance 1 check against local DBLP coauthors if searched by name
    if (!targetAuthor && y1ByName.has(normQuery)) {
      const hit = y1ByName.get(normQuery);
      const firstPaper = hit.papers[0];
      renderYaleNumberChain(
        resultEl,
        1,
        `<strong>${hit.name}</strong> is a direct co-author!`,
        [{ name: hit.name }, { name: 'Yale Song', affil: 'Google' }],
        [{ ...firstPaper, extraCount: hit.papers.length - 1 }]
      );
      return;
    }

    // Resolve author profile via OpenAlex if not already provided
    let altProfiles = [];
    if (!targetAuthor) {
      const searchResp = await fetch(
        `https://api.openalex.org/authors?search=${encodeURIComponent(rawQuery)}&per_page=5`
      );
      if (!searchResp.ok) throw new Error('Failed to search OpenAlex authors');
      const searchData = await searchResp.json();
      const candidates = searchData.results || [];
      if (candidates.length === 0) {
        resultEl.innerHTML = `<span class="yn-summary">No researcher profile found matching "<strong>${rawQuery}</strong>". Try a full name as listed on DBLP/ArXiv.</span>`;
        return;
      }
      targetAuthor = candidates[0];
      altProfiles = candidates.slice(1);
    }

    const tid = (targetAuthor.id || '').split('/').pop();
    const tName = targetAuthor.display_name || rawQuery;
    const tAffil = ((targetAuthor.last_known_institutions || [])[0] || {}).display_name || '';
    const tNorm = normalizeAuthorName(tName);

    // Distance 1 check by OpenAlex ID or normalized name
    if (y1ById.has(tid) || y1ByName.has(tNorm)) {
      const hit = y1ByName.get(tNorm) || y1ById.get(tid);
      const firstPaper = hit.papers[0];
      renderYaleNumberChain(
        resultEl,
        1,
        `<strong>${tName}</strong> is a direct co-author!`,
        [{ name: tName, affil: tAffil }, { name: 'Yale Song', affil: 'Google' }],
        [{ ...firstPaper, extraCount: hit.papers.length - 1 }],
        altProfiles,
        alt => computeYaleNumber(alt)
      );
      return;
    }

    // Fetch target author's works for Distance 2 check
    const tWorksResp = await fetch(
      `https://api.openalex.org/works?filter=author.id:${tid}&select=id,title,publication_year,doi,authorships&sort=cited_by_count:desc&per_page=200`
    );
    const tWorks = tWorksResp.ok ? ((await tWorksResp.json()).results || []) : [];

    const c1ById = new Map();
    let dist2Hit = null;

    for (const w of tWorks) {
      const paperObj = {
        title: w.title || 'Untitled',
        year: w.publication_year || '',
        url: w.doi || w.id || ''
      };
      for (const a of w.authorships || []) {
        const aid = ((a.author && a.author.id) || '').split('/').pop();
        const aname = (a.author && a.author.display_name) || '';
        const anorm = normalizeAuthorName(aname);
        if (!aid || aid === tid) continue;

        if (y1ById.has(aid) || (anorm.includes(' ') && y1ByName.has(anorm))) {
          const bridge = y1ById.get(aid) || y1ByName.get(anorm);
          dist2Hit = {
            bridgeName: bridge.name || aname,
            paper1: paperObj,
            paper2: bridge.papers[0],
            extra2: bridge.papers.length - 1
          };
          break;
        }

        if (!c1ById.has(aid)) {
          c1ById.set(aid, { id: aid, name: aname, paper: paperObj });
        }
      }
      if (dist2Hit) break;
    }

    if (dist2Hit) {
      renderYaleNumberChain(
        resultEl,
        2,
        `Connected in <strong>2 steps</strong> via <strong>${dist2Hit.bridgeName}</strong>`,
        [
          { name: tName, affil: tAffil },
          { name: dist2Hit.bridgeName },
          { name: 'Yale Song', affil: 'Google' }
        ],
        [
          dist2Hit.paper1,
          { ...dist2Hit.paper2, extraCount: dist2Hit.extra2 }
        ],
        altProfiles,
        alt => computeYaleNumber(alt)
      );
      return;
    }

    // Distance 3 & 4 Bidirectional Meet-in-the-Middle Search
    resultEl.innerHTML = `<span class="loading">Checking 3–4 degrees of separation for ${tName}...</span>`;

    const c1Keys = Array.from(c1ById.keys()).slice(0, 100);
    const c1Chunks = [];
    for (let i = 0; i < c1Keys.length; i += 50) {
      c1Chunks.push(c1Keys.slice(i, i + 50));
    }

    const [c2Responses, y2Works] = await Promise.all([
      Promise.all(
        c1Chunks.map(c =>
          fetch(
            `https://api.openalex.org/works?filter=author.id:${c.join('|')}&select=id,title,publication_year,doi,authorships&sort=cited_by_count:desc&per_page=200`
          ).then(r => (r.ok ? r.json() : { results: [] }))
        )
      ),
      ensureYale2HopWorks(y1ById)
    ]);

    const c2Works = c2Responses.flatMap(r => r.results || []);
    const c2ById = new Map();
    let dist3Hit = null;

    for (const w of c2Works) {
      const paper2 = {
        title: w.title || 'Untitled',
        year: w.publication_year || '',
        url: w.doi || w.id || ''
      };
      const authorships = w.authorships || [];
      let c1Match = null;
      for (const a of authorships) {
        const aid = ((a.author && a.author.id) || '').split('/').pop();
        if (c1ById.has(aid)) {
          c1Match = c1ById.get(aid);
          break;
        }
      }
      if (!c1Match) continue;

      for (const a of authorships) {
        const aid = ((a.author && a.author.id) || '').split('/').pop();
        const aname = (a.author && a.author.display_name) || '';
        const anorm = normalizeAuthorName(aname);
        if (!aid || aid === c1Match.id || aid === tid) continue;

        if (y1ById.has(aid) || (anorm.includes(' ') && y1ByName.has(anorm))) {
          const y1Bridge = y1ById.get(aid) || y1ByName.get(anorm);
          dist3Hit = {
            c1: c1Match,
            paper2,
            y1: y1Bridge
          };
          break;
        }

        if (!c2ById.has(aid)) {
          c2ById.set(aid, { id: aid, name: aname, c1: c1Match, paper2 });
        }
      }
      if (dist3Hit) break;
    }

    let dist4Hit = null;
    if (!dist3Hit) {
      for (const w of y2Works) {
        const paper3 = {
          title: w.title || 'Untitled',
          year: w.publication_year || '',
          url: w.doi || w.id || ''
        };
        const authorships = w.authorships || [];
        let y1Match = null;
        for (const a of authorships) {
          const aid = ((a.author && a.author.id) || '').split('/').pop();
          if (y1ById.has(aid)) {
            y1Match = y1ById.get(aid);
            break;
          }
        }
        if (!y1Match) continue;

        for (const a of authorships) {
          const aid = ((a.author && a.author.id) || '').split('/').pop();
          if (!aid || aid === y1Match.id || aid === YALE_OPENALEX_ID) continue;

          if (c1ById.has(aid)) {
            dist3Hit = {
              c1: c1ById.get(aid),
              paper2: paper3,
              y1: y1Match
            };
            break;
          }
          if (!dist4Hit && c2ById.has(aid)) {
            dist4Hit = {
              c2: c2ById.get(aid),
              paper3,
              y1: y1Match
            };
          }
        }
        if (dist3Hit) break;
      }
    }

    if (dist3Hit) {
      renderYaleNumberChain(
        resultEl,
        3,
        `Connected in <strong>3 steps</strong> via <strong>${dist3Hit.c1.name}</strong> &rarr; <strong>${dist3Hit.y1.name}</strong>`,
        [
          { name: tName, affil: tAffil },
          { name: dist3Hit.c1.name },
          { name: dist3Hit.y1.name },
          { name: 'Yale Song', affil: 'Google' }
        ],
        [
          dist3Hit.c1.paper,
          dist3Hit.paper2,
          { ...dist3Hit.y1.papers[0], extraCount: dist3Hit.y1.papers.length - 1 }
        ],
        altProfiles,
        alt => computeYaleNumber(alt)
      );
      return;
    }

    if (dist4Hit) {
      renderYaleNumberChain(
        resultEl,
        4,
        `Connected in <strong>4 steps</strong> via <strong>${dist4Hit.c2.c1.name}</strong> &rarr; <strong>${dist4Hit.c2.name}</strong> &rarr; <strong>${dist4Hit.y1.name}</strong>`,
        [
          { name: tName, affil: tAffil },
          { name: dist4Hit.c2.c1.name },
          { name: dist4Hit.c2.name },
          { name: dist4Hit.y1.name },
          { name: 'Yale Song', affil: 'Google' }
        ],
        [
          dist4Hit.c2.c1.paper,
          dist4Hit.c2.paper2,
          dist4Hit.paper3,
          { ...dist4Hit.y1.papers[0], extraCount: dist4Hit.y1.papers.length - 1 }
        ],
        altProfiles,
        alt => computeYaleNumber(alt)
      );
      return;
    }

    resultEl.innerHTML = `<span class="yn-summary">No path of length &le; 4 found for <strong>${tName}</strong> in the sampled top publications.</span>`;
  } catch (err) {
    console.error('Yale Number error:', err);
    resultEl.innerHTML = '<span class="error">Could not compute connection path right now. Please try again.</span>';
  }
}

function initYaleNumberTool() {
  const form = document.getElementById('yn-form');
  const input = document.getElementById('yn-input');
  const suggestionsEl = document.getElementById('yn-suggestions');
  if (!form || !input) return;

  let debounceTimer = null;

  input.addEventListener('input', () => {
    const q = input.value.trim();
    clearTimeout(debounceTimer);
    if (q.length < 3) {
      suggestionsEl.style.display = 'none';
      return;
    }
    debounceTimer = setTimeout(async () => {
      try {
        const resp = await fetch(
          `https://api.openalex.org/authors?search=${encodeURIComponent(q)}&per_page=6`
        );
        if (!resp.ok) return;
        const data = await resp.json();
        const results = data.results || [];
        if (results.length === 0 || document.activeElement !== input) {
          suggestionsEl.style.display = 'none';
          return;
        }
        suggestionsEl.innerHTML = '';
        results.forEach(author => {
          const li = document.createElement('li');
          const inst = ((author.last_known_institutions || [])[0] || {}).display_name || '';
          li.innerHTML = `
            <span class="yn-sug-name">${author.display_name}</span>
            <span class="yn-sug-meta">${inst ? `${inst} · ` : ''}${author.works_count || 0} works</span>
          `;
          li.addEventListener('mousedown', (e) => {
            e.preventDefault();
            input.value = author.display_name;
            suggestionsEl.style.display = 'none';
            computeYaleNumber(author);
          });
          suggestionsEl.appendChild(li);
        });
        suggestionsEl.style.display = 'block';
      } catch (e) {
        // Ignore autocomplete errors
      }
    }, 250);
  });

  input.addEventListener('blur', () => {
    setTimeout(() => {
      if (suggestionsEl) suggestionsEl.style.display = 'none';
    }, 150);
  });

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (suggestionsEl) suggestionsEl.style.display = 'none';
    computeYaleNumber(input.value);
  });

  document.querySelectorAll('.yn-example-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      const name = chip.dataset.name;
      input.value = name;
      if (suggestionsEl) suggestionsEl.style.display = 'none';
      computeYaleNumber(name);
    });
  });
}

// Initial render
window.addEventListener('DOMContentLoaded', () => {
  initTheme();
  renderEditableSections();
  initAdminMode();
  initYaleNumberTool();
  renderNews(1);
  fetchPublications();
});
