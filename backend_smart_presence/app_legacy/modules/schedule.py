# app/modules/schedule.py
import datetime

def get_current_period():
    hour = datetime.datetime.now().hour
    if 9 <= hour < 11:
        return 1
    if 11 <= hour < 13:
        return 2
    if 13 <= hour < 16:
        return 3
    return None
