# Does not impose the use of langtrace, but will initialize it if the API key is set
# Must be imported at the top of the file
try:
	import os
	from langtrace_python_sdk import langtrace
	if os.getenv("LANGTRACE_API_KEY"):
		langtrace.init(api_key=os.getenv("LANGTRACE_API_KEY"))
except (ImportError, Exception):
	langtrace = None


from crewai import Agent, Crew, Process, Task
from crewai.project import CrewBase, agent, crew, task
from .tools.kupo_tool import KupoTool
from .tools.token_registry_tool import TokenRegistryTool
from .models.report_result import ReportResult
from dotenv import load_dotenv
load_dotenv(override=True)

kupo_tool = KupoTool()
token_registry_tool = TokenRegistryTool()

@CrewBase
class DegenCrew():
	"""DegenCrew crew"""

	agents_config = 'config/agents.yaml'
	tasks_config = 'config/tasks.yaml'

	############
	## Agents ##
	############
	@agent
	def researcher(self) -> Agent:
		return Agent(
			config=self.agents_config['researcher'],
			tools=[kupo_tool],
			verbose=True,
			output_file='report.md'
		)

	@agent
	def token_registry_analyst(self) -> Agent:
		return Agent(
			config=self.agents_config['token_registry_analyst'],
			tools=[token_registry_tool],
			verbose=True
		)

	@agent
	def reporting_analyst(self) -> Agent:
		return Agent(
			config=self.agents_config['reporting_analyst'],
			verbose=True
		)

	###########
	## Tasks ##
	###########
	@task
	def research_task(self) -> Task:
		return Task(
			config=self.tasks_config['research_task'],
		)

	@task
	def token_registry_task(self) -> Task:
		return Task(
			config=self.tasks_config['token_registry_task'],
		)

	@task
	def reporting_task(self) -> Task:
		return Task(
			config=self.tasks_config['reporting_task'],
			output_pydantic=ReportResult
		)

	@crew
	def crew(self) -> Crew:
		"""Creates the DegenCrew crew"""

		return Crew(
			agents=self.agents,
			tasks=self.tasks,
			process=Process.sequential,
			verbose=True,
		)
