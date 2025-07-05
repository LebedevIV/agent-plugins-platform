import sys
import json
import asyncio
import aiohttp
from typing import Any, Dict

async def main():
    """Основная функция MCP сервера для тестового плагина времени"""
    try:
        while True:
            line = sys.stdin.readline()
            if not line:
                break
                
            request = json.loads(line)
            response = await process_request(request)
            
            sys.stdout.write(json.dumps(response) + '\n')
            sys.stdout.flush()
            
    except Exception as e:
        error_response = {
            "error": {
                "code": -32603,
                "message": f"Internal error: {str(e)}"
            }
        }
        sys.stdout.write(json.dumps(error_response) + '\n')
        sys.stdout.flush()

async def process_request(request: Dict[str, Any]) -> Dict[str, Any]:
    """Обработка MCP запросов"""
    method = request.get('method')
    params = request.get('params', {})
    
    if method == 'get_time':
        return await get_current_time(params)
    elif method == 'ping':
        return {"result": "pong"}
    else:
        return {
            "error": {
                "code": -32601,
                "message": f"Method not found: {method}"
            }
        }

async def get_current_time(params: Dict[str, Any]) -> Dict[str, Any]:
    """Получение текущего времени с сервера"""
    try:
        timezone = params.get('timezone', 'Europe/Moscow')
        
        async with aiohttp.ClientSession() as session:
            url = f"http://worldtimeapi.org/api/timezone/{timezone}"
            async with session.get(url) as response:
                if response.status == 200:
                    data = await response.json()
                    return {
                        "result": {
                            "datetime": data.get('datetime'),
                            "timezone": data.get('timezone'),
                            "utc_offset": data.get('utc_offset'),
                            "day_of_week": data.get('day_of_week'),
                            "message": f"Текущее время в {timezone}: {data.get('datetime')}"
                        }
                    }
                else:
                    return {
                        "error": {
                            "code": -32603,
                            "message": f"Ошибка получения времени: HTTP {response.status}"
                        }
                    }
    except Exception as e:
        return {
            "error": {
                "code": -32603,
                "message": f"Ошибка запроса времени: {str(e)}"
            }
        }

if __name__ == "__main__":
    asyncio.run(main()) 