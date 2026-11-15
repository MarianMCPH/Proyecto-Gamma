import pymysql

# Django 6 exige mysqlclient >= 2.2.1; pymysql se hace pasar por esa versión.
pymysql.version_info = (2, 2, 1, "final", 0)
pymysql.install_as_MySQLdb()