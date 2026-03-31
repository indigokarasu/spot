#!/usr/bin/env python3
"""
SevenRooms Availability Checker
Public API - no authentication required
"""

import requests
import json
import re
from datetime import datetime, timedelta
from urllib.parse import urljoin


def get_venue_id_from_url(url):
    """
    Extract venue ID from SevenRooms URL.
    
    Example URLs:
    - https://www.sevenrooms.com/explore/quince/reservations/create/search/
    - https://www.sevenrooms.com/reservations/quince
    """
    # Try to extract from path
    patterns = [
        r'/explore/([^/]+)/reservations',
        r'/reservations/([^/]+)',
        r'/explore/([^/]+)/',
    ]
    
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    
    return None


def check_sevenrooms_availability(venue_id, date, party_size=2, time_slot="19:00"):
    """
    Check availability for a SevenRooms venue.
    
    Args:
        venue_id: The venue slug (e.g., 'quince')
        date: Date string in YYYY-MM-DD format
        party_size: Number of guests
        time_slot: Preferred time (24h format, e.g., "19:00")
    
    Returns:
        Dict with availability info
    """
    # Convert date from YYYY-MM-DD to MM-DD-YYYY for SevenRooms API
    converted_date = datetime.strptime(date, "%Y-%m-%d").strftime("%m-%d-%Y")
    
    # SevenRooms widget API endpoint
    url = "https://www.sevenrooms.com/api-yoa/availability/widget/range"
    
    headers = {
        'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'Accept': 'application/json, text/plain, */*',
        'Accept-Language': 'en-US,en;q=0.9',
        'Referer': f'https://www.sevenrooms.com/reservations/{venue_id}',
    }
    
    params = {
        'venue': venue_id,
        'time_slot': time_slot,
        'party_size': party_size,
        'halo_size_interval': 16,
        'start_date': converted_date,
        'num_days': 1,
        'channel': 'SEVENROOMS_WIDGET'
    }
    
    try:
        response = requests.get(url, params=params, headers=headers, timeout=10)
        
        if response.status_code == 200:
            data = response.json()
            
            # Parse the availability response
            available_times = []
            try:
                # Extract availability for the requested date
                availability = data.get("data", {}).get("availability", {})
                date_availability = availability.get(date, [])
                
                if date_availability and len(date_availability) > 0:
                    times_list = date_availability[0].get("times", [])
                    for slot in times_list:
                        time_str = slot.get("time", "")
                        is_available = slot.get("is_available", False)
                        public_desc = slot.get("public_time_slot_description", "")
                        
                        if is_available:
                            available_times.append({
                                'time': time_str,
                                'available': True,
                                'seating': public_desc
                            })
            except Exception as e:
                print(f"Error parsing availability: {e}")
            
            return {
                'platform': 'sevenrooms',
                'venue': venue_id,
                'date': date,
                'party_size': party_size,
                'available': len(available_times) > 0,
                'times': available_times,
                'raw_response': data
            }
        else:
            return {
                'platform': 'sevenrooms',
                'venue': venue_id,
                'date': date,
                'party_size': party_size,
                'available': False,
                'times': [],
                'error': f'HTTP {response.status_code}',
                'raw_response': response.text
            }
            
    except Exception as e:
        return {
            'platform': 'sevenrooms',
            'venue': venue_id,
            'date': date,
            'party_size': party_size,
            'available': False,
            'times': [],
            'error': str(e)
        }


def find_first_saturday_sevenrooms(venue_id, start_date, party_size=2, max_weeks=12):
    """
    Find the first Saturday with availability.
    
    Args:
        venue_id: SevenRooms venue slug
        start_date: Starting date (YYYY-MM-DD)
        party_size: Number of guests
        max_weeks: Maximum weeks to check
    """
    current = datetime.strptime(start_date, "%Y-%m-%d")
    
    # Move to next Saturday (weekday 5)
    while current.weekday() != 5:
        current += timedelta(days=1)
    
    print(f"Starting search from {current.strftime('%Y-%m-%d')}...")
    
    for week in range(max_weeks):
        date_str = current.strftime("%Y-%m-%d")
        print(f"  Checking Saturday {date_str}...", end=' ')
        
        result = check_sevenrooms_availability(venue_id, date_str, party_size)
        
        if result.get('available') and result.get('times'):
            print(f"✓ Available!")
            return result
        
        print("✗ Not available")
        current += timedelta(days=7)
    
    return None


if __name__ == "__main__":
    import sys
    
    if len(sys.argv) < 2:
        print("Usage: python sevenrooms_availability.py <venue_id> [date] [party_size]")
        print("\nExamples:")
        print("  python sevenrooms_availability.py quince")
        print("  python sevenrooms_availability.py quince 2026-05-03 2")
        sys.exit(1)
    
    venue_id = sys.argv[1]
    
    # Default to first Saturday ~1 month out
    if len(sys.argv) >= 3:
        date = sys.argv[2]
    else:
        target = datetime.now() + timedelta(days=35)
        # Move to Saturday
        while target.weekday() != 5:
            target += timedelta(days=1)
        date = target.strftime("%Y-%m-%d")
    
    party_size = int(sys.argv[3]) if len(sys.argv) > 3 else 2
    
    print(f"SevenRooms Availability Check")
    print(f"Venue: {venue_id}")
    print(f"Date: {date}")
    print(f"Party size: {party_size}")
    print("-" * 40)
    
    result = check_sevenrooms_availability(venue_id, date, party_size)
    print(json.dumps(result, indent=2))
