#!/bin/sh
chmod -R 777 /data /content ;
chown -R happypandax.happypandax /data /content ;
su - happypandax <<EOF
cd /;
exec ./happypandax/happypandax ;
<<EOF