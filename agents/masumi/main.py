#!/usr/bin/env python
import warnings
from degen_crew.crew import DegenCrew
warnings.filterwarnings("ignore", category=SyntaxWarning, module="pysbd")

# This main file is intended to be a way for you to run your
# crew locally, so refrain from adding unnecessary logic into this file.
# Replace with inputs you want to test with, it will automatically
# interpolate any tasks and agents information

def run():
    """
    Run the crew.
    """
    inputs = {
        'addresses': 
            [
                'addr1z8ke0c9p89rjfwmuh98jpt8ky74uy5mffjft3zlcld9h7ml3lmln3mwk0y3zsh3gs3dzqlwa9rjzrxawkwm4udw9axhs6fuu6e', 
                # 'addr1x89ksjnfu7ys02tedvslc9g2wk90tu5qte0dt4dge60hdudj764lvrxdayh2ux30fl0ktuh27csgmpevdu89jlxppvrsg0g63z'
                'addr1q8dz48gfgaz5t7rt4myj3wwg9xswhm3xpv8kzr5xuerstrx6vpyy397umwnqpllqmc0gg7gay374pvdqw3llzh0t9t2s278a47'
            ]
    }
    
    try:
        DegenCrew().crew().kickoff(inputs=inputs)
    except Exception as e:
        raise Exception(f"An error occurred while running the crew: {e}")
