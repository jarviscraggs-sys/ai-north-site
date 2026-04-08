import os
import sys
import traceback
import urllib.request

os.environ['HF_KEY'] = 'fe32f74b-89b4-40c7-9002-2a5aa5e5de05:9705d398e900d27cdb7d11df1675c96e6ed5a408ee4dea1b8fa58abb419ec53c'

import higgsfield_client

OUTPUT_DIR = '/Users/jarvis/.openclaw/workspace/clearclaim-videos/videoclips'
os.makedirs(OUTPUT_DIR, exist_ok=True)

clips = [
    {
        'filename': 'v1_contractor_stress.mp4',
        'prompt': 'A stressed UK construction site manager sitting at a cluttered desk late at night, surrounded by paper invoices and spreadsheets, rubbing his temples, warm desk lamp, cinematic, photorealistic, shallow depth of field'
    },
    {
        'filename': 'v2_spreadsheet_chaos.mp4',
        'prompt': 'Close up of hands frantically typing on a laptop showing a chaotic spreadsheet with hundreds of coloured rows, sticky notes everywhere, coffee cup, office at night, cinematic, photorealistic'
    },
    {
        'filename': 'v3_phone_messages.mp4',
        'prompt': 'Close up of a smartphone screen with endless WhatsApp invoice messages flooding in, person looking stressed holding the phone, construction office background blurred, cinematic, photorealistic'
    },
    {
        'filename': 'v4_clearclaim_dashboard.mp4',
        'prompt': 'A contractor sitting at a clean modern desk smiling, looking at a sleek dark blue software dashboard on a laptop showing financial charts and invoice summaries, professional office, cinematic, photorealistic'
    },
    {
        'filename': 'v5_invoice_approval.mp4',
        'prompt': 'Close up of hands clicking approve on a clean modern dark UI invoice approval screen on a laptop, green checkmark appearing, satisfying, professional, cinematic, photorealistic'
    },
    {
        'filename': 'v6_cis_report.mp4',
        'prompt': 'Close up of a dark themed financial report on a laptop screen showing CIS deduction calculations, a PDF downloading, professional, cinematic, photorealistic'
    },
    {
        'filename': 'v7_construction_site.mp4',
        'prompt': 'A confident UK construction site manager in hi-vis jacket and hard hat walking across a busy modern construction site at golden hour, cinematic wide shot, photorealistic, inspirational'
    },
    {
        'filename': 'v8_team_working.mp4',
        'prompt': 'A small construction business team in an office, smiling and working together around a laptop showing management software, professional, warm lighting, cinematic, photorealistic'
    },
]

generated = []
failed = []

for clip in clips:
    filename = clip['filename']
    prompt = clip['prompt']
    output_path = os.path.join(OUTPUT_DIR, filename)
    
    print(f'\n--- Generating: {filename} ---', flush=True)
    print(f'Prompt: {prompt[:80]}...', flush=True)
    
    try:
        result = higgsfield_client.subscribe(
            'minimax/hailuo-02/standard/text-to-video',
            arguments={
                'prompt': prompt,
                'duration': 6,
                'resolution': '1080p',
                'aspect_ratio': '16:9'
            }
        )
        url = result['video']['url']
        print(f'Got URL: {url[:60]}...', flush=True)
        urllib.request.urlretrieve(url, output_path)
        size = os.path.getsize(output_path)
        print(f'Done: {filename} ({size} bytes)', flush=True)
        generated.append(filename)
    except Exception as e:
        print(f'ERROR generating {filename}: {e}', flush=True)
        traceback.print_exc()
        failed.append((filename, str(e)))

# Write completion file
complete_path = os.path.join(OUTPUT_DIR, 'clips_complete.txt')
with open(complete_path, 'w') as f:
    f.write('ClearClaim Marketing Video Clips\n')
    f.write('=================================\n\n')
    f.write(f'Generated: {len(generated)} clips\n')
    f.write(f'Failed: {len(failed)} clips\n\n')
    if generated:
        f.write('Successfully generated:\n')
        for g in generated:
            f.write(f'  - {g}\n')
    if failed:
        f.write('\nFailed clips:\n')
        for fname, err in failed:
            f.write(f'  - {fname}: {err}\n')

print(f'\n=== COMPLETE ===')
print(f'Generated: {generated}')
print(f'Failed: {failed}')
