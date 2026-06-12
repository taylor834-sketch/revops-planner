const REPO = process.env.GITHUB_REPO || 'taylor834-sketch/revops-planner';
const TOKEN = process.env.GITHUB_TOKEN;
const FILE_PATH = 'state.json';
const API_BASE = `https://api.github.com/repos/${REPO}/contents/${FILE_PATH}`;

const headers = {
  'Authorization': `token ${TOKEN}`,
  'Accept': 'application/vnd.github.v3+json',
  'User-Agent': 'revops-planner',
};

export default async function handler(req, res) {
  if (!TOKEN) {
    return res.status(500).json({ error: 'GITHUB_TOKEN not configured' });
  }

  if (req.method === 'GET') {
    const ghRes = await fetch(API_BASE, { headers });
    if (ghRes.status === 404) {
      return res.status(404).json({ error: 'No saved state found' });
    }
    if (!ghRes.ok) {
      return res.status(ghRes.status).json({ error: await ghRes.text() });
    }
    const file = await ghRes.json();
    const decoded = Buffer.from(file.content, 'base64').toString('utf-8');
    return res.status(200).json({ data: JSON.parse(decoded), sha: file.sha });
  }

  if (req.method === 'PUT') {
    const snapshot = req.body;
    if (!snapshot) {
      return res.status(400).json({ error: 'Missing body' });
    }

    let sha = null;
    const existing = await fetch(API_BASE, { headers });
    if (existing.ok) {
      const file = await existing.json();
      sha = file.sha;
    }

    const content = Buffer.from(JSON.stringify(snapshot, null, 2), 'utf-8').toString('base64');
    const body = {
      message: 'Update planner state — ' + new Date().toISOString(),
      content,
    };
    if (sha) body.sha = sha;

    const ghRes = await fetch(API_BASE, {
      method: 'PUT',
      headers: { ...headers, 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!ghRes.ok) {
      return res.status(ghRes.status).json({ error: await ghRes.text() });
    }
    return res.status(200).json({ ok: true });
  }

  return res.status(405).json({ error: 'Method not allowed' });
}
