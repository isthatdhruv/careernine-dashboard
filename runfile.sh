npm install 
sudo npm run build
cd report-gen-english
sudo virtualenv .venv
sudo source .venv/bin/activate
sudo pip install -r requirements.txt
cd ../report-gen-hindi
sudo virtualenv .venv
sudo source .venv/bin/activate
sudo pip install -r requirements.txts