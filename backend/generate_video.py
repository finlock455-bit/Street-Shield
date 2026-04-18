import asyncio
import sys
import os
import traceback
from dotenv import load_dotenv

sys.path.insert(0, os.path.abspath(''))
load_dotenv('/app/backend/.env')

from emergentintegrations.llm.openai.video_generation import OpenAIVideoGeneration

def generateVideo(prompt, output_path, model="sora-2", size="1280x720", duration=8):
    """Generate video with Sora 2"""
    video_gen = OpenAIVideoGeneration(api_key=os.environ['EMERGENT_LLM_KEY'])
    video_bytes = video_gen.text_to_video(
        prompt=prompt,
        model=model,
        size=size,
        duration=duration,
        max_wait_time=600
    )
    if video_bytes:
        video_gen.save_video(video_bytes, output_path)
        return output_path
    return None

if __name__ == "__main__":
    prompt = """Slow cinematic aerial shot of a futuristic city at night with beautiful neon lights in cyan and pink colors reflecting on rain-slicked streets below. The camera glides smoothly between sleek glass towers with glowing signage. Cyberpunk aesthetic, moody atmosphere, stunning urban landscape, professional cinematography with shallow depth of field and anamorphic lens flares."""

    print("Generating Street Shield promo video (landscape 1280x720, 8s)...")
    result = generateVideo(prompt, '/app/screenshots/marketing/promo_video.mp4')
    print(f'Video saved to: {result}' if result else 'Video generation failed')
