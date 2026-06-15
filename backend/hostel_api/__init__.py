"""
Make Django's MySQL backend use the pure-Python PyMySQL driver.

PyMySQL reports its own version (1.1.x), but Django's mysql backend refuses
anything that looks older than mysqlclient 1.4.3. We spoof the version_info so
Django accepts it, then register PyMySQL under the MySQLdb name.
"""
import pymysql

pymysql.version_info = (1, 4, 6, "final", 0)
pymysql.install_as_MySQLdb()
