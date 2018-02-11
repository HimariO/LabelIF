import os
import argparse
import uuid

parser = argparse.ArgumentParser()
parser.add_argument("-f", "--folder", help="root folder")
parser.add_argument("-p", "--prefix", help="prefix of renamed file")
parser.add_argument("-u", "--uuid", help="use uuid1 as new file name")
args = parser.parse_args()

F = args.folder
uuid_name = []

for i in os.listdir(F):
    file_p = os.path.join(F, i)

    if os.path.isdir(file_p):
        jpgs = [j for j in  os.listdir(file_p) if '.jpg' in j]
        xmls = [j for j in  os.listdir(file_p) if '.xml' in j]

        # if not all([a.replace('.jpg', '') == b.replace('.xml', '') for a, b in zip(jpgs, xmls)]):
        #     print("%s jpg & xml files not matching!" % file_p)
        #     continue

        if args.uuid:
            if len(jpgs) > 0:
                for i, jp in enumerate(jpgs):
                    if len(uuid_name) != len(jpgs):
                        uuid_name.append(str(uuid.uuid1()))
                        os.rename(
                        os.path.join(file_p, jp),
                        os.path.join(file_p, '%s.jpg' % uuid_name[-1])
                        )
                    else:
                        os.rename(
                        os.path.join(file_p, jp),
                        os.path.join(file_p, '%s.jpg' % uuid_name[i])
                        )

            else:
                for i, xm in enumerate(xmls):
                    if len(uuid_name) != len(xmls):
                        uuid_name.append(str(uuid.uuid1()))
                        os.rename(
                            os.path.join(file_p, xm),
                            os.path.join(file_p, '%s.xml' % uuid_name[-1])
                        )
                    else:
                        os.rename(
                            os.path.join(file_p, xm),
                            os.path.join(file_p, '%s.xml' % uuid_name[i])
                        )
        else:
            for jp in jpgs:
                os.rename(
                    os.path.join(file_p, jp),
                    os.path.join(file_p, args.prefix + jp)
                )

            for xm in xmls:
                os.rename(
                    os.path.join(file_p, xm),
                    os.path.join(file_p, args.prefix + xm)
                )
