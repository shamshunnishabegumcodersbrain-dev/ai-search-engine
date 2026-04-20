from apscheduler.schedulers.background import BackgroundScheduler
from apscheduler.triggers.interval import IntervalTrigger
from loguru import logger
import atexit


def start_scheduler(scrape_function):
    scheduler = BackgroundScheduler()

    scheduler.add_job(
        func=scrape_function,
        trigger=IntervalTrigger(weeks=1),
        id='weekly_scrape',
        name='Weekly website scraper',
        replace_existing=True
    )

    scheduler.start()
    logger.info("Scheduler started — scraper will run every 7 days")

    atexit.register(lambda: scheduler.shutdown())

    return scheduler