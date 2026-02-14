#!/usr/bin/env python3
"""
Olympic Medal Data Processor

This script processes the Kaggle "120 years of Olympic history" CSV dataset
and converts it into a structured JSON file for the Olympic medals visualization.

Requirements:
- Python 3.6+
- pandas

Install dependencies:
    pip install pandas

Usage:
    python process_data.py

Input:
    data/raw/athlete_events.csv (from Kaggle dataset)
    
Output:
    data/summer_medals.json (processed Summer Olympics medal counts by year and country)
    data/winter_medals.json (processed Winter Olympics medal counts by year and country)
"""

import json
import pandas as pd
from collections import defaultdict

# IOC to ISO country code mapping
IOC_TO_ISO = {
    # Major countries (straightforward)
    'USA': 'US', 'GBR': 'GB', 'FRA': 'FR', 'GER': 'DE', 'CHN': 'CN',
    'JPN': 'JP', 'AUS': 'AU', 'CAN': 'CA', 'ITA': 'IT', 'BRA': 'BR',
    'ESP': 'ES', 'KOR': 'KR', 'NED': 'NL', 'SWE': 'SE', 'NOR': 'NO',
    'DEN': 'DK', 'FIN': 'FI', 'POL': 'PL', 'ROU': 'RO', 'NZL': 'NZ',
    'MEX': 'MX', 'ARG': 'AR', 'BEL': 'BE', 'SUI': 'CH', 'AUT': 'AT',
    'GRE': 'GR', 'CUB': 'CU', 'POR': 'PT', 'IND': 'IN', 'RSA': 'ZA',
    'TUR': 'TR', 'KEN': 'KE', 'JAM': 'JM', 'ETH': 'ET', 'UKR': 'UA',
    'CZE': 'CZ', 'HUN': 'HU', 'BUL': 'BG', 'IRL': 'IE', 'IRI': 'IR',
    'EGY': 'EG', 'PAK': 'PK', 'NGR': 'NG', 'CHI': 'CL', 'COL': 'CO',
    'VEN': 'VE', 'THA': 'TH', 'MAS': 'MY', 'SGP': 'SG', 'PHI': 'PH',
    'INA': 'ID', 'ISR': 'IL', 'URU': 'UY', 'MAR': 'MA', 'ALG': 'DZ',
    'PER': 'PE', 'VIE': 'VN', 'CRO': 'HR', 'SLO': 'SI', 'SRB': 'RS',
    'SVK': 'SK', 'EST': 'EE', 'LAT': 'LV', 'LTU': 'LT', 'GEO': 'GE',
    'ARM': 'AM', 'AZE': 'AZ', 'KAZ': 'KZ', 'UZB': 'UZ', 'BLR': 'BY',
    
    # Historical countries (mapped to modern successors)
    'URS': 'RU',  # USSR -> Russia (primary successor)
    'GDR': 'DE',  # East Germany -> Germany
    'FRG': 'DE',  # West Germany -> Germany
    'TCH': 'CZ',  # Czechoslovakia -> Czech Republic (primary successor)
    'YUG': 'RS',  # Yugoslavia -> Serbia (primary successor)
    'SCG': 'RS',  # Serbia and Montenegro -> Serbia
    'EUN': 'RU',  # Unified Team (1992) -> Russia
    
    # Special Olympic teams
    'ROC': 'RU',  # Russian Olympic Committee -> Russia
    'OAR': 'RU',  # Olympic Athletes from Russia -> Russia
    
    # Additional mappings
    'RUS': 'RU', 'CHN': 'CN', 'KOR': 'KR', 'TPE': 'TW',
    'HKG': 'HK', 'PRK': 'KP', 'MGL': 'MN', 'NEP': 'NP',
}

# Countries that should be marked as "historical"
HISTORICAL_COUNTRIES = {
    'URS': 'USSR (1952-1988)',
    'GDR': 'East Germany (1968-1988)',
    'FRG': 'West Germany (1968-1988)',
    'TCH': 'Czechoslovakia (1920-1992)',
    'YUG': 'Yugoslavia (1920-1992)',
    'SCG': 'Serbia and Montenegro (1996-2006)',
    'EUN': 'Unified Team (1992)',
}


def load_and_filter_data(csv_path, season='Summer'):
    """Load CSV and filter for specified Olympics season."""
    print(f"Loading data from {csv_path}...")
    df = pd.read_csv(csv_path)
    
    print(f"Total records: {len(df)}")
    
    # Filter for specified season
    df_season = df[df['Season'] == season].copy()
    print(f"{season} Olympics records: {len(df_season)}")
    
    # Filter for medal winners only (exclude NaN medals)
    df_medals = df_season[df_season['Medal'].notna()].copy()
    print(f"Medal records: {len(df_medals)}")
    
    return df_medals


def aggregate_medals(df):
    """Aggregate medals by year and country."""
    print("\nAggregating medals by year and country...")
    
    # Group by Year, NOC (National Olympic Committee code), and Medal type
    medal_counts = defaultdict(lambda: defaultdict(lambda: {'gold': 0, 'silver': 0, 'bronze': 0}))
    
    for _, row in df.iterrows():
        year = int(row['Year'])
        noc = row['NOC']
        medal = row['Medal'].lower()
        
        # Map IOC code to ISO code
        iso_code = IOC_TO_ISO.get(noc)
        if iso_code is None:
            print(f"Warning: No mapping for NOC code '{noc}', skipping...")
            continue
        
        # Increment medal count
        if medal in ['gold', 'silver', 'bronze']:
            medal_counts[year][iso_code][medal] += 1
    
    return medal_counts


def add_metadata(medal_counts):
    """Add metadata like historical flags and display names."""
    print("\nAdding metadata...")
    
    result = {}
    
    for year, countries in medal_counts.items():
        result[year] = {}
        
        for iso_code, medals in countries.items():
            # Check if this ISO code came from a historical country
            historical = False
            display_name = None
            
            # Find original NOC codes that map to this ISO
            for noc, iso in IOC_TO_ISO.items():
                if iso == iso_code and noc in HISTORICAL_COUNTRIES:
                    historical = True
                    # For display, we'll note it includes historical medals
                    if display_name is None:
                        # Use the modern country name but mark as including historical
                        display_name = f"{get_country_name(iso_code)}*"
                    break
            
            result[year][iso_code] = {
                'gold': medals['gold'],
                'silver': medals['silver'],
                'bronze': medals['bronze'],
                'historical': historical,
                'display_name': display_name
            }
    
    return result


def get_country_name(iso_code):
    """Get display name for ISO country code."""
    # Simple mapping of common countries
    names = {
        'US': 'United States',
        'GB': 'Great Britain',
        'FR': 'France',
        'DE': 'Germany',
        'CN': 'China',
        'JP': 'Japan',
        'AU': 'Australia',
        'CA': 'Canada',
        'IT': 'Italy',
        'BR': 'Brazil',
        'RU': 'Russia',
        'ES': 'Spain',
        'KR': 'South Korea',
        'NL': 'Netherlands',
        'SE': 'Sweden',
        # Add more as needed
    }
    return names.get(iso_code, iso_code)


def save_json(data, output_path):
    """Save processed data as JSON."""
    print(f"\nSaving processed data to {output_path}...")
    
    with open(output_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    
    print("Done!")


def print_statistics(data):
    """Print summary statistics."""
    print("\n" + "="*50)
    print("STATISTICS")
    print("="*50)
    
    total_years = len(data)
    total_countries = len(set(country for year_data in data.values() for country in year_data.keys()))
    total_medals = sum(
        country_data['gold'] + country_data['silver'] + country_data['bronze']
        for year_data in data.values()
        for country_data in year_data.values()
    )
    
    print(f"Years covered: {total_years}")
    print(f"Unique countries: {total_countries}")
    print(f"Total medals: {total_medals}")
    print(f"Year range: {min(data.keys())} - {max(data.keys())}")
    
    # Top 5 countries by total medals
    country_totals = defaultdict(int)
    for year_data in data.values():
        for country, medals in year_data.items():
            country_totals[country] += medals['gold'] + medals['silver'] + medals['bronze']
    
    top_countries = sorted(country_totals.items(), key=lambda x: x[1], reverse=True)[:5]
    print("\nTop 5 countries by total medals:")
    for country, total in top_countries:
        print(f"  {country}: {total}")


def main():
    # File paths
    input_csv = 'data/raw/athlete_events.csv'
    summer_output = 'data/summer_medals.json'
    winter_output = 'data/winter_medals.json'
    
    try:
        # Process Summer Olympics
        print("="*50)
        print("PROCESSING SUMMER OLYMPICS")
        print("="*50)
        df_summer = load_and_filter_data(input_csv, 'Summer')
        medal_counts_summer = aggregate_medals(df_summer)
        final_data_summer = add_metadata(medal_counts_summer)
        print_statistics(final_data_summer)
        save_json(final_data_summer, summer_output)
        
        # Process Winter Olympics
        print("\n" + "="*50)
        print("PROCESSING WINTER OLYMPICS")
        print("="*50)
        df_winter = load_and_filter_data(input_csv, 'Winter')
        medal_counts_winter = aggregate_medals(df_winter)
        final_data_winter = add_metadata(medal_counts_winter)
        print_statistics(final_data_winter)
        save_json(final_data_winter, winter_output)
        
    except FileNotFoundError:
        print(f"\nERROR: Could not find '{input_csv}'")
        print("\nPlease download the Kaggle dataset:")
        print("1. Go to: https://www.kaggle.com/datasets/heesoo37/120-years-of-olympic-history-athletes-and-results")
        print("2. Download 'athlete_events.csv'")
        print("3. Place it in: data/raw/athlete_events.csv")
        print("\nThen run this script again.")
    except Exception as e:
        print(f"\nERROR: {e}")
        import traceback
        traceback.print_exc()


if __name__ == '__main__':
    main()
