import os
import json
import urllib.request

os.environ['HF_KEY'] = 'fe32f74b-89b4-40c7-9002-2a5aa5e5de05:9705d398e900d27cdb7d11df1675c96e6ed5a408ee4dea1b8fa58abb419ec53c'
import higgsfield_client

OUTPUT_DIR = '/Users/jarvis/.openclaw/workspace/clearclaim-videos'
SUMMARY_FILE = os.path.join(OUTPUT_DIR, 'scenes_complete.txt')

scenes = [
    {
        "filename": "scene2_spreadsheet_chaos.png",
        "prompt": "Close-up of a chaotic Excel spreadsheet on a laptop screen with hundreds of colour-coded rows, receipts and sticky notes scattered around, hands typing frantically, office at night, cinematic, photorealistic"
    },
    {
        "filename": "scene3_whatsapp_chaos.png",
        "prompt": "Close-up of a smartphone screen showing a long WhatsApp thread with unread invoice messages, stressed person holding phone, blurred construction site background, photorealistic, cinematic"
    },
    {
        "filename": "scene4_missed_retention.png",
        "prompt": "Close-up of a sticky note on a desk that reads RETENTION - URGENT, surrounded by financial documents and calculator, construction office, dramatic lighting, photorealistic"
    },
    {
        "filename": "scene5_clearclaim_dashboard.png",
        "prompt": "A modern dark blue construction management software dashboard on a laptop screen, clean UI with charts and invoice lists, contractor smiling and leaning back relaxed in office chair, professional office setting, photorealistic, cinematic"
    },
    {
        "filename": "scene6_invoice_approval.png",
        "prompt": "Close-up of hands on a laptop keyboard, on screen a clean invoice approval interface with a green approved checkmark animating, modern dark UI, professional, photorealistic"
    },
    {
        "filename": "scene7_cis_calculation.png",
        "prompt": "Close-up of a financial breakdown on a screen showing gross amount, VAT, CIS deduction, net payment with a PDF certificate downloading, clean dark modern UI, professional, photorealistic"
    },
    {
        "filename": "scene8_timesheet.png",
        "prompt": "A construction worker on a building site checking their phone, filling in a digital weekly timesheet app, hard hat and hi-vis jacket, construction site background, golden hour lighting, photorealistic, cinematic"
    },
    {
        "filename": "scene9_team_calendar.png",
        "prompt": "Close-up of a clean digital team holiday calendar on a screen showing staff availability with colour coded dots, capacity warnings, modern dark UI, professional office, photorealistic"
    },
    {
        "filename": "scene10_cta.png",
        "prompt": "A confident professional construction site manager standing on a modern construction site at golden hour, arms crossed, smiling, hi-vis jacket and hard hat, cinematic wide shot, photorealistic, inspirational"
    },
]

client = higgsfield_client.SyncClient()
results = []

# Scene 1 already done
results.append({
    "filename": "scene1_contractor_desk.png",
    "status": "already_done",
    "url": "N/A"
})

for scene in scenes:
    print(f"\n--- Generating {scene['filename']} ---")
    try:
        def on_enqueue(req_id):
            print(f"  Enqueued: {req_id}")
        
        def on_update(status):
            print(f"  Status: {type(status).__name__}")
        
        result = client.subscribe(
            application='bytedance/seedream/v4/text-to-image',
            arguments={
                "prompt": scene["prompt"],
                "resolution": "2K",
                "aspect_ratio": "16:9"
            },
            on_enqueue=on_enqueue,
            on_queue_update=on_update
        )
        
        print(f"  Raw result: {json.dumps(result, indent=2)[:500]}")
        
        # Extract image URL from result
        image_url = None
        if isinstance(result, dict):
            # Try common response shapes
            if 'url' in result:
                image_url = result['url']
            elif 'images' in result and result['images']:
                image_url = result['images'][0].get('url') or result['images'][0]
            elif 'output' in result:
                out = result['output']
                if isinstance(out, list) and out:
                    image_url = out[0]
                elif isinstance(out, str):
                    image_url = out
            elif 'data' in result:
                data = result['data']
                if isinstance(data, list) and data:
                    image_url = data[0].get('url') if isinstance(data[0], dict) else data[0]
        elif isinstance(result, str):
            image_url = result
        elif isinstance(result, list) and result:
            image_url = result[0] if isinstance(result[0], str) else result[0].get('url')
        
        if image_url:
            out_path = os.path.join(OUTPUT_DIR, scene['filename'])
            print(f"  Downloading from: {image_url}")
            urllib.request.urlretrieve(image_url, out_path)
            print(f"  Saved to: {out_path}")
            results.append({
                "filename": scene['filename'],
                "status": "success",
                "url": image_url
            })
        else:
            print(f"  ERROR: Could not find image URL in result: {result}")
            results.append({
                "filename": scene['filename'],
                "status": "error",
                "error": f"Could not extract URL from result: {str(result)[:200]}"
            })
    except Exception as e:
        print(f"  EXCEPTION: {e}")
        results.append({
            "filename": scene['filename'],
            "status": "error",
            "error": str(e)
        })

# Write summary
with open(SUMMARY_FILE, 'w') as f:
    f.write("ClearClaim Marketing Video - Scene Generation Summary\n")
    f.write("=" * 60 + "\n\n")
    for r in results:
        f.write(f"File: {r['filename']}\n")
        f.write(f"Status: {r['status']}\n")
        if r.get('url'):
            f.write(f"URL: {r['url']}\n")
        if r.get('error'):
            f.write(f"Error: {r['error']}\n")
        f.write("\n")

print("\n\n=== COMPLETE ===")
print(f"Summary written to: {SUMMARY_FILE}")
for r in results:
    status_icon = "✓" if r['status'] in ('success', 'already_done') else "✗"
    print(f"  {status_icon} {r['filename']} - {r['status']}")
