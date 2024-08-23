import json
import os
import pathlib
import shutil
import sys

import requests

cwd = os.getcwd()
zip_name = 'out'
zip_path = f'{cwd}/{zip_name}.zip'
src_dir = 'www'
src_path = f'{cwd}/{src_dir}'

if os.path.exists(zip_path):
    os.remove(zip_path)

with open(f'{src_path}/screenshots/usernames.json', 'r') as f:
    usernames = json.load(f)

for username in usernames:
    screenshot_path = f'{src_path}/screenshots/{username}.jpg'
    if os.path.exists(screenshot_path):
        continue
    url = f'https://nekoweb.org/screenshots/{username}/index_large.jpg'
    # TODO: Detect 404s
    response = requests.get(url, stream=True)
    with open(screenshot_path, 'wb') as f:
        shutil.copyfileobj(response.raw, f)
    # TODO: Optimize the images - https://stackoverflow.com/a/13211834

shutil.make_archive(zip_name, 'zip', src_path)

# TODO: Detect NEKOWEB_API_KEY in environment rather than argv length
if len(sys.argv) == 2:
    base = 'https://nekoweb.org/api'
    api_key = sys.argv[1]
    headers = {'Authorization': api_key}
    response = requests.get(f'{base}/files/big/create', headers=headers)
    data = response.json()
    big_file_id = data['id']
    # https://requests.readthedocs.io/en/latest/user/quickstart/#post-a-multipart-encoded-file
    files = {'file': open(zip_path, 'rb')}
    data = {'id': big_file_id}
    response = requests.post(f'{base}/files/big/append', headers=headers, files=files, data=data)
    response = requests.post(f'{base}/files/import/{big_file_id}', headers=headers)
