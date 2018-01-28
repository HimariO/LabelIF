import os
import argparse

parser = argparse.ArgumentParser()
parser.add_argument("-f", "--folder", help="root folder")
parser.add_argument("-p", "--prefix", help="prefix of renamed file")
args = parser.parse_args()

F = args.folder

for i in os.listdir(F):
    file_p = os.path.join(F, i)
    if os.path.isdir(file_p):
        jpgs = [j for j in  os.listdir(file_p) if '.jpg' in j]
        for jp in jpgs:
            os.rename(
                os.path.join(file_p, jp),
                os.path.join(file_p, args.prefix + jp)
            )
