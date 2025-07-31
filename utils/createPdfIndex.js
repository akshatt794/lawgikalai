// utils/createPdfIndex.js (or temporary route)
const osClient = require('../utils/osClient');

async function createPdfDocumentsIndex() {
  try {
    const exists = await osClient.indices.exists({ index: 'pdf_documents' });

    if (!exists.body) {
      await osClient.indices.create({
        index: 'pdf_documents',
        body: {
          settings: {
            number_of_shards: 1,
            number_of_replicas: 1
          },
          mappings: {
            properties: {
              title: { type: 'text' },
              file_url: { type: 'text', index: false },
              content: { type: 'text' },
              uploaded_at: { type: 'date' }
            }
          }
        }
      });
      console.log('✅ Index `pdf_documents` created');
    } else {
      console.log('ℹ️ Index `pdf_documents` already exists');
    }
  } catch (err) {
    console.error('❌ Failed to create index:', err);
  }
}

createPdfDocumentsIndex();
