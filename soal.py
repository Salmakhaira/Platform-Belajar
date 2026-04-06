import pandas as pd
from supabase import create_client

# GANTI DENGAN CREDENTIALS KAMU!
SUPABASE_URL = "https://kflifquietouwnvrmliz.supabase.co"
SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtmbGlmcXVpZXRvdXdudnJtbGl6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzEwNTYyNDksImV4cCI6MjA4NjYzMjI0OX0.qSWub0BN4PAcwpa00Uf5-CHQnVpODI621oh0MLESwqY"

supabase = create_client(SUPABASE_URL, SUPABASE_KEY)

# Read CSV
df = pd.read_csv('soal_utbk.csv')

print(f"📊 Total soal: {len(df)}")

# Convert to dict
questions = df.to_dict('records')

# Insert batch (100 per batch)
batch_size = 100
for i in range(0, len(questions), batch_size):
    batch = questions[i:i+batch_size]
    try:
        supabase.table('questions').insert(batch).execute()
        print(f"✅ Inserted {len(batch)} soal")
    except Exception as e:
        print(f"❌ Error: {e}")

print("🎉 SELESAI!")