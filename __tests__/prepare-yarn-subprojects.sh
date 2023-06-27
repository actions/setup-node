#!/bin/sh -e
export YARN_ENABLE_IMMUTABLE_INSTALLS=false
rm package.json
rm package-lock.json
echo "create yarn2 project in the sub2"
mkdir sub2
cd sub2
cat <<EOT >package.json
{
  "name": "subproject",
  "dependencies": {
    "random": "^3.0.6",
    "uuid": "^9.0.0"
  }
}
EOT
yarn set version 2.4.3
yarn install

echo "create yarn3 project in the sub3"
cd ..
mkdir sub3
cd sub3
cat <<EOT >package.json
{
  "name": "subproject",
  "dependencies": {
    "random": "^3.0.6",
    "uuid": "^9.0.0"
  }
}
EOT
yarn set version 3.5.1
yarn install
if [ x$1 = 'xglobal' ];then
  echo enableGlobalCache
  echo 'enableGlobalCache: true' >> .yarnrc.yml
fi

cd ..
if [ x$1 != 'xkeepcache' -a x$2 != 'xkeepcache' ]; then
  rm -rf sub2/.yarn/cache
  rm -rf sub3/.yarn/cache
fi

if [ x$1 = 'xyarn1' ];then
  echo "create yarn1 project in the root"
  cat <<EOT >package.json
{
  "name": "subproject",
  "dependencies": {
    "random": "^3.0.6",
    "uuid": "^9.0.0"
  }
}
EOT
  yarn set version 1.22.19
  yarn install
fi