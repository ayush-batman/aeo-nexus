curl -X POST http://localhost:3001/api/llm/scans \
-H "Content-Type: application/json" \
-d '{
  "prompt": "Compare the following two brands for dashcam in india: 1. dylect 2. qubo. Which one is better and why?",
  "brandName": "dylect",
  "competitors": ["qubo"],
  "mode": "battle"
}'
