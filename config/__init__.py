import pymysql
from django.db.backends.mysql.features import DatabaseFeatures

pymysql.version_info = (2, 2, 7, "final", 0)
pymysql.install_as_MySQLdb()

# Compatibilidad con MySQL 8.0.22 de Clever Cloud
DatabaseFeatures.minimum_database_version = (8, 0)