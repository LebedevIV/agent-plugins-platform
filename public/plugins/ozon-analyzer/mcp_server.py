import sys
import json
import asyncio
import re
from typing import Any, Dict, List
from bs4 import BeautifulSoup

# Глобальная переменная для доступа к JavaScript API
js = None

async def main():
    """Основная функция MCP сервера для анализатора Ozon"""
    global js
    
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
    
    if method == 'analyze_product':
        return await analyze_ozon_product(params)
    elif method == 'ping':
        return {"result": "pong"}
    else:
        return {
            "error": {
                "code": -32601,
                "message": f"Method not found: {method}"
            }
        }

async def analyze_ozon_product(params: Dict[str, Any]) -> Dict[str, Any]:
    """Анализ товара на Ozon"""
    try:
        # Получаем HTML страницы
        page_html = params.get('page_html', '')
        if not page_html:
            return {
                "error": {
                    "code": -32602,
                    "message": "HTML страницы не предоставлен"
                }
            }
        
        # Парсим HTML
        soup = BeautifulSoup(page_html, 'html.parser')
        
        # Проверяем, что это страница товара
        if not page_html.startswith('https://www.ozon.ru/product/'):
            return {
                "result": {
                    "message": "Это не страница товара Ozon. Перейдите на страницу товара для анализа."
                }
            }
        
        # Извлекаем категории из breadcrumbs
        categories = extract_categories(soup)
        
        # Извлекаем описание и состав
        description, composition = extract_description_and_composition(soup)
        
        # Анализируем соответствие описания и состава
        analysis_result = analyze_composition_vs_description(description, composition)
        
        # Ищем аналоги
        analogs = await find_similar_products(categories, composition)
        
        return {
            "result": {
                "categories": categories,
                "description": description,
                "composition": composition,
                "analysis": analysis_result,
                "analogs": analogs,
                "message": f"Анализ завершен. Оценка соответствия: {analysis_result['score']}/10"
            }
        }
        
    except Exception as e:
        return {
            "error": {
                "code": -32603,
                "message": f"Ошибка анализа товара: {str(e)}"
            }
        }

def extract_categories(soup: BeautifulSoup) -> List[str]:
    """Извлекает категории из breadcrumbs"""
    categories = []
    
    breadcrumbs = soup.find('div', {'data-widget': 'breadCrumbs'})
    if breadcrumbs:
        links = breadcrumbs.find_all('a')
        for link in links:
            href = link.get('href', '')
            if '/category/' in href:
                # Извлекаем название категории
                span = link.find('span')
                if span:
                    categories.append(span.text.strip())
    
    return categories

def extract_description_and_composition(soup: BeautifulSoup) -> tuple:
    """Извлекает описание и состав товара"""
    description = ""
    composition = ""
    
    # Ищем div с описанием
    description_sections = soup.find_all('div', {'id': 'section-description'})
    
    for section in description_sections:
        h2 = section.find('h2')
        if h2:
            h2_text = h2.text.strip().lower()
            
            if 'описание' in h2_text:
                # Извлекаем описание
                desc_div = section.find('div')
                if desc_div:
                    description = desc_div.get_text(strip=True)
                    
            elif 'состав' in h2_text or 'характеристики' in h2_text:
                # Извлекаем состав
                comp_div = section.find('div')
                if comp_div:
                    composition = comp_div.get_text(strip=True)
    
    return description, composition

def analyze_composition_vs_description(description: str, composition: str) -> Dict[str, Any]:
    """Анализирует соответствие описания и состава с помощью простой логики"""
    
    if not description or not composition:
        return {
            "score": 0,
            "reasoning": "Не удалось извлечь описание или состав товара",
            "details": []
        }
    
    # Простая логика анализа (в реальном проекте здесь была бы нейросеть)
    score = 5  # Базовая оценка
    
    details = []
    
    # Проверяем длину описания
    if len(description) < 50:
        score -= 2
        details.append("Описание слишком короткое")
    
    # Проверяем наличие ключевых слов в составе
    key_ingredients = ['вода', 'глицерин', 'масло', 'экстракт', 'витамин']
    found_ingredients = []
    
    for ingredient in key_ingredients:
        if ingredient.lower() in composition.lower():
            found_ingredients.append(ingredient)
    
    if found_ingredients:
        score += 1
        details.append(f"Найдены полезные ингредиенты: {', '.join(found_ingredients)}")
    else:
        score -= 1
        details.append("Не найдены полезные ингредиенты")
    
    # Проверяем соответствие описания составу
    description_words = set(re.findall(r'\b\w+\b', description.lower()))
    composition_words = set(re.findall(r'\b\w+\b', composition.lower()))
    
    common_words = description_words.intersection(composition_words)
    if len(common_words) > 5:
        score += 1
        details.append("Описание и состав имеют общие ключевые слова")
    else:
        score -= 1
        details.append("Описание и состав не соответствуют друг другу")
    
    # Ограничиваем оценку от 1 до 10
    score = max(1, min(10, score))
    
    reasoning = f"Оценка {score}/10: "
    if score >= 8:
        reasoning += "Отличное соответствие описания и состава"
    elif score >= 6:
        reasoning += "Хорошее соответствие с небольшими расхождениями"
    elif score >= 4:
        reasoning += "Среднее соответствие, есть расхождения"
    else:
        reasoning += "Плохое соответствие, описание не отражает реальный состав"
    
    return {
        "score": score,
        "reasoning": reasoning,
        "details": details
    }

async def find_similar_products(categories: List[str], composition: str) -> List[Dict[str, Any]]:
    """Ищет аналогичные товары (заглушка)"""
    # В реальном проекте здесь был бы поиск по API Ozon
    analogs = []
    
    if categories:
        # Симулируем поиск аналогов
        for i, category in enumerate(categories[:3]):
            analogs.append({
                "name": f"Аналог в категории {category}",
                "price": f"{1000 + i * 200} ₽",
                "url": f"https://www.ozon.ru/search?text={category}",
                "similarity": f"{80 - i * 10}%"
            })
    
    return analogs

if __name__ == "__main__":
    asyncio.run(main()) 