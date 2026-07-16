import base64
from pathlib import Path
import requests

invoke_url = "https://integrate.api.nvidia.com/v1/chat/completions"
stream = True

def media_data_url(kind, index, mime_types):
    for suffix, mime in mime_types.items():
        path = Path(f"{kind}_{index}{suffix}")
        if path.exists():
            return f"data:{mime};base64,{base64.b64encode(path.read_bytes()).decode()}"
    raise FileNotFoundError(f"Expected {kind}_{index} with suffix in {list(mime_types)}")

image_data_urls = [media_data_url("image", i, {".png": "image/png", ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".webp": "image/webp"}) for i in [1]]

headers = {
    "Authorization": "Bearer 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",
    "Accept": "text/event-stream" if stream else "application/json",
}

payload = {
  "messages": [
    {
      "role": "user",
      "content": [
        {
          "type": "image_url",
          "image_url": {
            "url": image_data_urls[0]
          }
        },
        {
          "type": "text",
          "text": "What is in this image?"
        }
      ]
    }
  ],
  "model": "nvidia/nemotron-3-nano-omni-30b-a3b-reasoning",
  "max_tokens": 65536,
  "reasoning_budget": 16384,
  "stream": stream,
  "temperature": 0.6,
  "top_p": 0.95,
  "chat_template_kwargs": {
    "enable_thinking": True
  }
}

response = requests.post(invoke_url, headers=headers, json=payload, stream=stream)
if stream:
    for line in response.iter_lines():
        if line:
            print(line.decode("utf-8"))
else:
    print(response.json())