const { Pool } = require('pg');
const fs = require('fs');
const path = require('path');

const pool = new Pool({
  connectionString: 'postgresql://neondb_owner:npg_AgtB1KRoPys4@ep-cold-dust-ace0m3h6-pooler.sa-east-1.aws.neon.tech/neondb?sslmode=require',
  ssl: { rejectUnauthorized: false }
});

const uploadsDir = path.join(__dirname, '..', 'public', 'uploads');

async function main() {
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
  }

  const result = await pool.query("SELECT data FROM mourato_store WHERE id = 'main'");
  const data = result.rows[0].data;
  const produtos = data.rows.Produto;

  let migrated = 0;
  let skipped = 0;

  for (const produto of produtos) {
    if (!produto.imagem || !produto.imagem.startsWith('data:image')) {
      skipped++;
      continue;
    }

    // Extrair extensão e dados
    const match = produto.imagem.match(/^data:image\/(\w+);base64,(.+)$/);
    if (!match) {
      console.log('  SKIP (formato invalido):', produto.nome);
      skipped++;
      continue;
    }

    const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
    const base64Data = match[2];
    const buffer = Buffer.from(base64Data, 'base64');

    // Nome do arquivo: id + slug do nome
    const slug = produto.nome
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    
    const filename = `produto-${produto.id}-${slug}.${ext}`;
    const filepath = path.join(uploadsDir, filename);
    const urlPath = `/uploads/${filename}`;

    // Salvar arquivo
    fs.writeFileSync(filepath, buffer);
    
    // Atualizar produto com URL
    produto.imagem = urlPath;
    migrated++;

    const sizeKB = (buffer.length / 1024).toFixed(0);
    console.log(`  ✅ ${produto.nome} → ${filename} (${sizeKB} KB)`);
  }

  // Salvar de volta no banco
  await pool.query(
    `UPDATE mourato_store SET data = $1::jsonb, updated_at = NOW() WHERE id = 'main'`,
    [JSON.stringify(data)]
  );

  console.log('');
  console.log('=== RESULTADO ===');
  console.log('Migradas:', migrated);
  console.log('Puladas (já URL ou sem imagem):', skipped);
  console.log('');
  console.log('Banco atualizado com URLs.');

  pool.end();
}

main().catch(err => {
  console.error('ERRO:', err);
  pool.end();
});
