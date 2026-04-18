import os
import sys
import subprocess
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(''))
load_dotenv('/app/backend/.env')

from emergentintegrations.llm.openai.video_generation import OpenAIVideoGeneration

def gen(prompt, output_path, duration=4):
    """Generate video with Sora 2"""
    video_gen = OpenAIVideoGeneration(api_key=os.environ['EMERGENT_LLM_KEY'])
    video_bytes = video_gen.text_to_video(
        prompt=prompt,
        model="sora-2",
        size="1280x720",
        duration=duration,
        max_wait_time=600
    )
    if video_bytes:
        video_gen.save_video(video_bytes, output_path)
        print(f"Saved: {output_path}")
        return True
    return False

os.makedirs('/app/screenshots/marketing', exist_ok=True)

# Scene 1: Night walking scenario
print("Generating Scene 1: Night city walk...")
s1 = gen(
    "Aerial cinematic shot slowly descending toward a modern city street at night. Neon cyan and pink signs illuminate wet pavement. Rain drops create beautiful reflections. Moody cyberpunk atmosphere, professional color grading. Vertical 9:16 format.",
    '/app/screenshots/marketing/scene_city.mp4',
    duration=4
)
print(f"Scene 1: {'OK' if s1 else 'FAILED'}")

# Scene 2: Cycling scenario
print("Generating Scene 2: Cycling at dusk...")
s2 = gen(
    "Close-up cinematic shot of bicycle wheels spinning on a city bike lane at dusk. Neon city lights blur in the background. Rain-slicked road reflecting cyan and pink neon. Smooth slow motion, shallow depth of field. Vertical 9:16 format.",
    '/app/screenshots/marketing/scene_cycling.mp4',
    duration=4
)
print(f"Scene 2: {'OK' if s2 else 'FAILED'}")

# Scene 3: Phone notification / tech
print("Generating Scene 3: Tech close-up...")
s3 = gen(
    "Extreme close-up of a smartphone screen glowing with cyan light in a dark environment. Digital interface elements and holographic data visualizations float above the screen. Futuristic tech aesthetic, soft bokeh lights in background. Vertical 9:16 format.",
    '/app/screenshots/marketing/scene_tech.mp4',
    duration=4
)
print(f"Scene 3: {'OK' if s3 else 'FAILED'}")

print("\nAll scenes generated. Ready for assembly.")
