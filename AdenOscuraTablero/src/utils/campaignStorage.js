export const openCampaignDB = () => new Promise((resolve, reject) => {
  const req = window.indexedDB.open('vtt_robust_campaign_db', 3);
  req.onupgradeneeded = (e) => {
    const db = e.target.result;
    if (!db.objectStoreNames.contains('campaign_store')) {
      db.createObjectStore('campaign_store');
    }
    if (!db.objectStoreNames.contains('campaign_snapshots')) {
      db.createObjectStore('campaign_snapshots', { keyPath: 'timestamp' });
    }
  };
  req.onsuccess = () => resolve(req.result);
  req.onerror = () => reject(req.error);
});

export const saveCampaignToDB = async (stateData, createSnapshot = false) => {
  try {
    const db = await openCampaignDB();
    const payload = {
      ...stateData,
      version: '1.4.0',
      updatedAt: new Date().toISOString()
    };

    const tx = db.transaction(['campaign_store', 'campaign_snapshots'], 'readwrite');
    tx.objectStore('campaign_store').put(payload, 'active_campaign');

    if (createSnapshot) {
      const snapStore = tx.objectStore('campaign_snapshots');
      snapStore.put({
        timestamp: Date.now(),
        dateStr: new Date().toLocaleTimeString(),
        data: payload
      });

      // Mantener solo las últimas 5 copias automáticas para no saturar disco
      const keysReq = snapStore.getAllKeys();
      keysReq.onsuccess = () => {
        const keys = keysReq.result || [];
        if (keys.length > 5) {
          const toDelete = keys.slice(0, keys.length - 5);
          toDelete.forEach(k => snapStore.delete(k));
        }
      };
    }
    return true;
  } catch (e) {
    console.error('Error guardando campaña en IndexedDB:', e);
    return false;
  }
};

export const loadCampaignFromDB = async () => {
  try {
    const db = await openCampaignDB();
    return await new Promise((resolve) => {
      const tx = db.transaction('campaign_store', 'readonly');
      const req = tx.objectStore('campaign_store').get('active_campaign');
      req.onsuccess = () => resolve(req.result || null);
      req.onerror = () => resolve(null);
    });
  } catch (e) {
    return null;
  }
};

export const getCampaignSnapshots = async () => {
  try {
    const db = await openCampaignDB();
    return await new Promise((resolve) => {
      const tx = db.transaction('campaign_snapshots', 'readonly');
      const req = tx.objectStore('campaign_snapshots').getAll();
      req.onsuccess = () => resolve((req.result || []).reverse());
      req.onerror = () => resolve([]);
    });
  } catch (e) {
    return [];
  }
};

export const exportCampaignJSON = (stateData) => {
  const cleanPayload = {
    ...stateData,
    exportedAt: new Date().toISOString(),
    app: 'Grimorio VTT'
  };
  const blob = new Blob([JSON.stringify(cleanPayload, null, 2)], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `cronica_vtt_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 2000);
};